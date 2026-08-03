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
import { persistHealthMetrics } from '@/features/health/services/health-metrics-persist.service'
import {
	healthReportQualifiesForMetriclessCompletion,
	isReportDisplayReady,
	NO_LAB_METRICS_EXTRACTED_MESSAGE,
	reportHasExtractedText,
	reportNeedsReprocess,
} from '@/features/health/services/report-readiness.service'
import { buildHealthReportFromAiExtraction } from '@/features/health/services/health-ai-extraction.service'
import {
	clearRegistryErrorForReport,
	syncRegistryWithReportOutcome,
} from '@/features/health-import/services/registry-report-sync.service'
import type {
	HealthReportStatus,
	UploadedHealthReport,
} from '@/features/health/types'

export type HealthExtractionMode = 'deterministic' | 'llm_text'

const PENDING_STATUSES: HealthReportStatus[] = [
	'uploaded',
	'queued',
	'processing',
	'parsed',
]

const REPROCESSABLE_STATUSES: HealthReportStatus[] = [
	'completed',
	'failed',
	'parsed',
]

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
	options: { force?: boolean; extractionMode?: HealthExtractionMode } = {},
): Promise<UploadedHealthReport> {
	if (options.extractionMode === 'llm_text') {
		return processHealthReportWithAiText(reportId, options)
	}

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
		if (isReportDisplayReady(typedReport)) {
			createKnowledgeItemFromHealthReport(typedReport)
			return typedReport
		}
	} else if (!options.force && typedReport.status === 'processing') {
		return typedReport
	} else if (!options.force && typedReport.status === 'failed') {
		return typedReport
	} else if (
		!options.force &&
		typedReport.status === 'parsed' &&
		!reportNeedsReprocess(typedReport)
	) {
		return typedReport
	}

	try {
		await updateReportStatus(reportId, {
			status: 'processing',
			processing_error: null,
		})
		await clearRegistryErrorForReport(reportId)
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

		const serializedParsedData = serializeParsedHealthReport(healthReport)
		const parsedReportUpdate = {
			extracted_text: outcome.extractedText,
			parsed_data: serializedParsedData,
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

		await updateReportStatus(reportId, {
			status: 'parsed',
			...parsedReportUpdate,
		})

		await updateQueueStatus(reportId, 'parsed', {
			error_message: null,
		})

		let persistedMetricCount = 0

		try {
			persistedMetricCount = await persistHealthMetrics({
				userId: typedReport.user_id,
				reportId,
				familyMemberId: typedReport.family_member_id ?? null,
				healthReport,
				reportDate: healthReport.metadata.reportDate ?? typedReport.report_date,
			})
		} catch (metricError) {
			const errorDetail = buildWorkflowErrorDetail({
				stage: 'PARSING',
				error: metricError,
			})

			await updateReportStatus(reportId, {
				status: 'failed',
				processing_error: errorDetail.userMessage,
			})
			await updateQueueStatus(reportId, 'failed', {
				completed_at: processedAt,
				error_message: errorDetail.userMessage,
			})

			await safeTransitionWorkflowItem({
				reportId,
				toState: 'FAILED',
				context: {
					userId: typedReport.user_id,
					reportId,
					failureReason: errorDetail.userMessage,
					failedStage: 'PARSING',
					errorDetail,
				},
			})

			throw metricError
		}

		const allowsMetriclessCompletion =
			persistedMetricCount === 0 &&
			healthReportQualifiesForMetriclessCompletion({
				metadata: healthReport.metadata,
				fileName: typedReport.file_name,
			})

		if (persistedMetricCount === 0 && !allowsMetriclessCompletion) {
			failPipelineStage({
				reportId,
				stage: 'PARSING',
				error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
				details: {
					pageCount: outcome.pageCount,
					characters: outcome.extractedText.length,
					confidence: outcome.confidence,
					metricCount: 0,
				},
			})

			await updateReportStatus(reportId, {
				...parsedReportUpdate,
				status: 'failed',
				processing_error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			})

			await updateQueueStatus(reportId, 'failed', {
				error_message: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			})

			await safeTransitionWorkflowItem({
				reportId,
				toState: 'FAILED',
				context: {
					userId: typedReport.user_id,
					reportId,
					failureReason: NO_LAB_METRICS_EXTRACTED_MESSAGE,
					failedStage: 'PARSING',
				},
			})

			invalidateHealthKnowledgeCache(typedReport.user_id)
			invalidateAfterHealthImport(typedReport.user_id)

			await syncRegistryWithReportOutcome(reportId, {
				status: 'failed',
				errorMessage: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			})

			return {
				...typedReport,
				...parsedReportUpdate,
				status: 'failed',
				processing_error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			}
		}

		completePipelineStage({
			reportId,
			stage: 'PARSING',
			nextStage: 'INDEXING',
			details: {
				pageCount: outcome.pageCount,
				characters: outcome.extractedText.length,
				confidence: outcome.confidence,
				processingTimeMs: outcome.processingTimeMs,
				metricCount: persistedMetricCount,
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
			status: 'parsed',
			...parsedReportUpdate,
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

			await updateReportStatus(reportId, {
				status: 'failed',
				processing_error: errorDetail.userMessage,
			})
			await updateQueueStatus(reportId, 'failed', {
				completed_at: processedAt,
				error_message: errorDetail.userMessage,
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

		await updateReportStatus(reportId, {
			status: 'completed',
			...parsedReportUpdate,
		})

		await updateQueueStatus(reportId, 'completed', {
			completed_at: processedAt,
			error_message: null,
		})

		const completedReport: UploadedHealthReport = {
			...typedReport,
			status: 'completed',
			...parsedReportUpdate,
		}

		invalidateHealthKnowledgeCache(completedReport.user_id)
		invalidateAfterHealthImport(completedReport.user_id)

		await syncRegistryWithReportOutcome(reportId, { status: 'completed' })

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

		await syncRegistryWithReportOutcome(reportId, {
			status: 'failed',
			errorMessage: errorDetail.userMessage,
		})

		throw new Error(errorDetail.userMessage)
	}
}

export async function reprocessHealthReport(
	reportId: string,
): Promise<UploadedHealthReport> {
	return processHealthReport(reportId, { force: true })
}

export async function reprocessHealthReportWithAi(
	reportId: string,
): Promise<UploadedHealthReport> {
	return processHealthReport(reportId, {
		force: true,
		extractionMode: 'llm_text',
	})
}

export async function listReportsEligibleForAiReprocess(
	userId: string,
): Promise<UploadedHealthReport[]> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.in('status', REPROCESSABLE_STATUSES)

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? [])
		.map((row) => row as UploadedHealthReport)
		.filter(
			(report) =>
				reportNeedsReprocess(report) && reportHasExtractedText(report),
		)
}

export async function reprocessFailedReportsWithAi(userId: string): Promise<{
	processed: number
	failed: number
	skipped: number
}> {
	const eligible = await listReportsEligibleForAiReprocess(userId)
	let processed = 0
	let failed = 0

	for (const report of eligible) {
		try {
			const result = await processHealthReport(report.id, {
				force: true,
				extractionMode: 'llm_text',
			})

			if (isReportDisplayReady(result)) {
				processed += 1
			} else {
				failed += 1
			}
		} catch {
			failed += 1
		}
	}

	if (processed > 0) {
		invalidateHealthKnowledgeCache(userId)
		await persistHealthKnowledgeGraph(userId, null)
		invalidateAfterHealthImport(userId)
	}

	return {
		processed,
		failed,
		skipped: 0,
	}
}

async function processHealthReportWithAiText(
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

	if (!reportHasExtractedText(typedReport)) {
		throw new Error(
			'This report has no stored OCR text. Run a standard reprocess first.',
		)
	}

	if (
		!options.force &&
		typedReport.status === 'completed' &&
		isReportDisplayReady(typedReport)
	) {
		return typedReport
	}

	if (!options.force && typedReport.status === 'processing') {
		return typedReport
	}

	const processedAt = new Date().toISOString()

	try {
		await updateReportStatus(reportId, {
			status: 'processing',
			processing_error: null,
		})
		await updateQueueStatus(reportId, 'processing', {
			started_at: processedAt,
			error_message: null,
		})

		startPipelineStage({
			reportId,
			stage: 'PARSING',
			nextStage: 'INDEXING',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'PARSING',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'AI metric extraction' },
			},
		})

		const healthReport = await buildHealthReportFromAiExtraction({
			report: typedReport,
		})
		const serializedParsedData = serializeParsedHealthReport(healthReport)
		const parsedReportUpdate = {
			extracted_text: typedReport.extracted_text,
			parsed_data: serializedParsedData,
			ocr_page_count: typedReport.ocr_page_count,
			ocr_confidence: typedReport.ocr_confidence,
			ocr_provider: typedReport.ocr_provider,
			ocr_processing_time_ms: typedReport.ocr_processing_time_ms,
			ocr_metadata: typedReport.ocr_metadata,
			report_type: healthReport.metadata.reportType,
			report_date: healthReport.metadata.reportDate ?? typedReport.report_date,
			processed_at: processedAt,
			processing_error: null,
		}

		await updateReportStatus(reportId, {
			status: 'parsed',
			...parsedReportUpdate,
		})
		await updateQueueStatus(reportId, 'parsed', { error_message: null })

		const persistedMetricCount = await persistHealthMetrics({
			userId: typedReport.user_id,
			reportId,
			familyMemberId: typedReport.family_member_id ?? null,
			healthReport,
			reportDate: healthReport.metadata.reportDate ?? typedReport.report_date,
		})

		if (persistedMetricCount === 0) {
			const allowsMetriclessCompletion =
				healthReportQualifiesForMetriclessCompletion({
					metadata: healthReport.metadata,
					fileName: typedReport.file_name,
				})

			if (!allowsMetriclessCompletion) {
				throw new Error(NO_LAB_METRICS_EXTRACTED_MESSAGE)
			}
		}

		completePipelineStage({
			reportId,
			stage: 'PARSING',
			nextStage: 'INDEXING',
			details: {
				metricCount: persistedMetricCount,
				extractionMode: 'llm_text',
				metricless: persistedMetricCount === 0,
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
				progress: { label: 'Saving AI metrics' },
			},
		})

		createKnowledgeItemFromHealthReport({
			...typedReport,
			status: 'parsed',
			...parsedReportUpdate,
		})

		await persistHealthKnowledgeGraph(
			typedReport.user_id,
			typedReport.family_member_id ?? null,
		)

		completePipelineStage({
			reportId,
			stage: 'INDEXING',
			nextStage: 'READY',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'READY',
			context: { userId: typedReport.user_id, reportId },
		})

		await updateReportStatus(reportId, {
			status: 'completed',
			...parsedReportUpdate,
		})
		await updateQueueStatus(reportId, 'completed', {
			completed_at: processedAt,
			error_message: null,
		})

		await syncRegistryWithReportOutcome(reportId, {
			status: 'completed',
		})

		const completedReport: UploadedHealthReport = {
			...typedReport,
			status: 'completed',
			...parsedReportUpdate,
		}

		invalidateHealthKnowledgeCache(completedReport.user_id)
		invalidateAfterHealthImport(completedReport.user_id)

		return completedReport
	} catch (error) {
		const errorDetail = buildWorkflowErrorDetail({
			stage: 'PARSING',
			error,
		})

		await updateReportStatus(reportId, {
			status: 'failed',
			processing_error: errorDetail.userMessage,
		})
		await updateQueueStatus(reportId, 'failed', {
			completed_at: processedAt,
			error_message: errorDetail.userMessage,
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'FAILED',
			context: {
				userId: typedReport.user_id,
				reportId,
				failureReason: errorDetail.userMessage,
				failedStage: 'PARSING',
				errorDetail,
			},
		})

		throw new Error(errorDetail.userMessage)
	}
}

export async function reprocessAllHealthReports(userId: string): Promise<{
	processed: number
	failed: number
}> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.in('status', REPROCESSABLE_STATUSES)

	if (error) {
		throw new Error(error.message)
	}

	let processed = 0
	let failed = 0

	for (const row of data ?? []) {
		const report = row as UploadedHealthReport

		if (!reportNeedsReprocess(report)) {
			continue
		}

		try {
			await processHealthReport(report.id, { force: true })
			processed += 1
		} catch {
			failed += 1
		}
	}

	invalidateHealthKnowledgeCache(userId)
	await persistHealthKnowledgeGraph(userId, null)
	invalidateAfterHealthImport(userId)

	return { processed, failed }
}

export async function reprocessStuckHealthReports(
	userId: string,
	options: { familyMemberId?: string | null } = {},
): Promise<{ processed: number; failed: number; succeeded: number }> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.in('status', REPROCESSABLE_STATUSES)

	if (error) {
		throw new Error(error.message)
	}

	let processed = 0
	let failed = 0
	let succeeded = 0

	for (const row of data ?? []) {
		const report = row as UploadedHealthReport

		if (options.familyMemberId) {
			const reportMemberId = report.family_member_id ?? null

			if (reportMemberId !== options.familyMemberId) {
				continue
			}
		}

		if (!reportNeedsReprocess(report)) {
			continue
		}

		processed += 1

		try {
			const result = await processHealthReport(report.id, { force: true })

			if (isReportDisplayReady(result)) {
				succeeded += 1
			} else if (result.status === 'failed') {
				failed += 1
			}
		} catch {
			failed += 1
		}
	}

	if (processed > 0) {
		invalidateHealthKnowledgeCache(userId)
		await persistHealthKnowledgeGraph(userId, options.familyMemberId ?? null)
		invalidateAfterHealthImport(userId)
	}

	return { processed, failed, succeeded }
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
			const needsForce = reportNeedsReprocess(report)

			if (report.status === 'uploaded') {
				await enqueueHealthReportProcessing(report.user_id, report.id)
			}

			await processHealthReport(report.id, { force: needsForce })
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
