import { supabase } from '@/lib/supabase'
import { documentProcessingConfig } from '@/config/document-processing'
import {
	createDocumentFromUpload,
	runDocumentIntelligencePipeline,
} from '@/features/document-intelligence'
import { createKnowledgeItemFromHealthReport } from '@/features/knowledge/services/knowledge-health.service'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { persistHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-persist.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { buildWorkflowErrorDetail } from '@/core/workflow/workflow-errors.types'
import { safeTransitionWorkflowItem } from '@/features/health/workflow/safe-workflow-transition'
import {
	completePipelineStage,
	failPipelineStage,
	startPipelineStage,
} from '@/features/health/pipeline/health-pipeline-logger'
import { serializeParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import type {
	HealthReportStatus,
	UploadedHealthReport,
} from '@/features/health/types'

const PENDING_STATUSES: HealthReportStatus[] = [
	'uploaded',
	'queued',
	'processing',
	'parsed',
]

const REPROCESSABLE_STATUSES: HealthReportStatus[] = ['completed', 'failed']

type ReportUpdate = Partial<
	Pick<
		UploadedHealthReport,
		| 'status'
		| 'extracted_text'
		| 'processed_at'
		| 'processing_error'
		| 'parsed_data'
		| 'ocr_page_count'
		| 'ocr_confidence'
		| 'ocr_provider'
		| 'ocr_processing_time_ms'
		| 'ocr_metadata'
		| 'report_type'
		| 'report_date'
	>
>

async function updateReportStatus(reportId: string, updates: ReportUpdate) {
	const { error } = await supabase
		.from('health_reports')
		.update(updates)
		.eq('id', reportId)

	if (error) {
		throw new Error(error.message)
	}
}

async function updateQueueStatus(
	reportId: string,
	status: HealthReportStatus,
	extra: {
		started_at?: string
		completed_at?: string
		error_message?: string | null
	} = {},
) {
	const { error } = await supabase
		.from('health_report_processing_queue')
		.update({ status, ...extra })
		.eq('report_id', reportId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function enqueueHealthReportProcessing(
	userId: string,
	reportId: string,
) {
	const { error } = await supabase
		.from('health_report_processing_queue')
		.upsert(
			{
				report_id: reportId,
				user_id: userId,
				status: 'queued',
				started_at: null,
				completed_at: null,
				error_message: null,
			},
			{ onConflict: 'report_id' },
		)

	if (error) {
		throw new Error(error.message)
	}

	await updateReportStatus(reportId, { status: 'queued' })
}

export async function processHealthReport(
	reportId: string,
	options: { force?: boolean } = {},
): Promise<UploadedHealthReport> {
	const { data: report, error: fetchError } = await supabase
		.from('health_reports')
		.select('*')
		.eq('id', reportId)
		.single()

	if (fetchError || !report) {
		throw new Error(fetchError?.message ?? 'Report not found.')
	}

	const typedReport = report as UploadedHealthReport

	if (typedReport.status === 'completed' && !options.force) {
		createKnowledgeItemFromHealthReport(typedReport)
		return typedReport
	}

	if (
		!options.force &&
		(typedReport.status === 'processing' || typedReport.status === 'parsed')
	) {
		return typedReport
	}

	if (typedReport.status === 'failed' && !options.force) {
		return typedReport
	}

	try {
		await updateReportStatus(reportId, {
			status: 'processing',
			processing_error: null,
		})
		await updateQueueStatus(reportId, 'processing', {
			started_at: new Date().toISOString(),
			error_message: null,
		})

		startPipelineStage({
			reportId,
			stage: 'OCR',
			nextStage: 'PARSING',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'OCR',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'Running OCR' },
				worker: documentProcessingConfig.ocrProvider,
			},
		})

		const document = createDocumentFromUpload({
			id: typedReport.id,
			userId: typedReport.user_id,
			fileName: typedReport.file_name,
			storagePath: typedReport.storage_path,
			uploadedAt: typedReport.uploaded_at,
		})

		const outcome = await runDocumentIntelligencePipeline({
			document,
			onProgress: async (progress) => {
				if (progress.stage === 'ocr_complete') {
					completePipelineStage({
						reportId,
						stage: 'OCR',
						nextStage: 'PARSING',
					})

					startPipelineStage({
						reportId,
						stage: 'PARSING',
						nextStage: 'READY',
					})

					await safeTransitionWorkflowItem({
						reportId,
						toState: 'OCR',
						context: {
							userId: typedReport.user_id,
							reportId,
							progress: {
								label: 'OCR complete',
								percent: 100,
							},
						},
					})
				}

				if (progress.stage === 'parsed') {
					await updateReportStatus(reportId, { status: 'parsed' })
					await updateQueueStatus(reportId, 'parsed')

					await safeTransitionWorkflowItem({
						reportId,
						toState: 'PARSING',
						context: {
							userId: typedReport.user_id,
							reportId,
							progress: { label: 'Parsing' },
						},
					})
				}
			},
		})

		if (outcome.stage === 'failed') {
			throw new Error(outcome.error)
		}

		const processedAt = new Date().toISOString()
		const { healthReport } = outcome

		if (!healthReport) {
			throw new Error('Expected a health report from the document pipeline.')
		}

		await updateReportStatus(reportId, {
			status: 'completed',
			extracted_text: outcome.extractedText,
			parsed_data: serializeParsedHealthReport(healthReport),
			ocr_page_count: outcome.pageCount,
			ocr_confidence: outcome.confidence,
			ocr_provider: outcome.ocrProvider,
			ocr_processing_time_ms: outcome.processingTimeMs,
			ocr_metadata: outcome.ocrMetadata as Record<string, unknown>,
			report_type: healthReport.metadata.reportType,
			report_date: healthReport.metadata.reportDate,
			processed_at: processedAt,
			processing_error: null,
		})

		await updateQueueStatus(reportId, 'completed', {
			completed_at: processedAt,
			error_message: null,
		})

		completePipelineStage({
			reportId,
			stage: 'PARSING',
			nextStage: 'INDEXING',
			details: {
				pageCount: outcome.pageCount,
				characters: outcome.extractedText.length,
				confidence: outcome.confidence,
				processingTimeMs: outcome.processingTimeMs,
				metricCount: healthReport.metrics.length,
			},
		})

		startPipelineStage({
			reportId,
			stage: 'INDEXING',
			nextStage: 'READY',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'INDEXING',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'Generating metrics' },
			},
		})

		createKnowledgeItemFromHealthReport({
			...typedReport,
			status: 'completed',
			extracted_text: outcome.extractedText,
			parsed_data: serializeParsedHealthReport(healthReport),
			ocr_page_count: outcome.pageCount,
			ocr_confidence: outcome.confidence,
			ocr_provider: outcome.ocrProvider,
			ocr_processing_time_ms: outcome.processingTimeMs,
			ocr_metadata: outcome.ocrMetadata as Record<string, unknown>,
			report_type: healthReport.metadata.reportType,
			report_date: healthReport.metadata.reportDate,
			processed_at: processedAt,
			processing_error: null,
		})

		try {
			await persistHealthKnowledgeGraph(
				typedReport.user_id,
				typedReport.family_member_id ?? null,
			)
		} catch (indexError) {
			const errorDetail = buildWorkflowErrorDetail({
				stage: 'INDEXING',
				error: indexError,
			})

			await safeTransitionWorkflowItem({
				reportId,
				toState: 'FAILED',
				context: {
					userId: typedReport.user_id,
					reportId,
					failureReason: errorDetail.userMessage,
					failedStage: 'INDEXING',
					errorDetail,
				},
			})

			throw indexError
		}

		completePipelineStage({
			reportId,
			stage: 'INDEXING',
			nextStage: 'READY',
		})

		startPipelineStage({
			reportId,
			stage: 'READY',
			details: { reportId },
		})

		completePipelineStage({
			reportId,
			stage: 'READY',
			details: { reportId },
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'READY',
			context: { userId: typedReport.user_id, reportId },
		})

		const completedReport: UploadedHealthReport = {
			...typedReport,
			status: 'completed',
			extracted_text: outcome.extractedText,
			parsed_data: serializeParsedHealthReport(healthReport),
			ocr_page_count: outcome.pageCount,
			ocr_confidence: outcome.confidence,
			ocr_provider: outcome.ocrProvider,
			ocr_processing_time_ms: outcome.processingTimeMs,
			ocr_metadata: outcome.ocrMetadata as Record<string, unknown>,
			report_type: healthReport.metadata.reportType,
			report_date: healthReport.metadata.reportDate,
			processed_at: processedAt,
			processing_error: null,
		}

		invalidateHealthKnowledgeCache(completedReport.user_id)
		invalidateAfterHealthImport(completedReport.user_id)

		return completedReport
	} catch (error) {
		const errorDetail = buildWorkflowErrorDetail({
			stage: 'OCR',
			error,
			edgeFunction:
				documentProcessingConfig.ocrProvider === 'google'
					? 'document-ocr'
					: undefined,
		})

		failPipelineStage({
			reportId,
			stage: 'OCR',
			error: errorDetail.message,
		})

		await updateReportStatus(reportId, {
			status: 'failed',
			processing_error: errorDetail.userMessage,
		})

		await updateQueueStatus(reportId, 'failed', {
			completed_at: new Date().toISOString(),
			error_message: errorDetail.userMessage,
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'FAILED',
			context: {
				userId: typedReport.user_id,
				reportId,
				failureReason: errorDetail.userMessage,
				failedStage: 'OCR',
				errorDetail,
			},
		})

		throw new Error(errorDetail.userMessage)
	}
}

export async function reprocessHealthReport(
	reportId: string,
): Promise<UploadedHealthReport> {
	return processHealthReport(reportId, { force: true })
}

export async function reprocessAllHealthReports(userId: string): Promise<{
	processed: number
	failed: number
}> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('id, status')
		.eq('user_id', userId)
		.in('status', REPROCESSABLE_STATUSES)

	if (error) {
		throw new Error(error.message)
	}

	let processed = 0
	let failed = 0

	for (const row of data ?? []) {
		try {
			await processHealthReport(row.id as string, { force: true })
			processed += 1
		} catch {
			failed += 1
		}
	}

	invalidateHealthKnowledgeCache(userId)
	await persistHealthKnowledgeGraph(userId, null)

	return { processed, failed }
}

export function processPendingHealthReports(
	reports: UploadedHealthReport[],
): Promise<void> {
	const pending = reports.filter((report) =>
		PENDING_STATUSES.includes(report.status),
	)

	return pending.reduce(async (chain, report) => {
		await chain

		try {
			if (report.status === 'uploaded') {
				await enqueueHealthReportProcessing(report.user_id, report.id)
			}

			await processHealthReport(report.id)
		} catch {
			// Individual failures are persisted on the report row
		}
	}, Promise.resolve())
}

export function getHealthReportStatusLabel(status: HealthReportStatus): string {
	switch (status) {
		case 'uploaded':
		case 'queued':
		case 'processing':
		case 'parsed':
			return 'Importing…'
		case 'completed':
			return 'Ready'
		case 'failed':
			return 'Import failed'
	}
}

export function hasPendingProcessing(reports: UploadedHealthReport[]): boolean {
	return reports.some((report) => PENDING_STATUSES.includes(report.status))
}

export function isProcessingStatus(status: HealthReportStatus): boolean {
	return status === 'processing' || status === 'parsed'
}
