import { supabase } from '@/lib/supabase'
import {
	createDocumentFromUpload,
	runDocumentIntelligencePipeline,
} from '@/features/document-intelligence'
import { createKnowledgeItemFromHealthReport } from '@/features/knowledge/services/knowledge-health.service'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { persistHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-persist.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { transitionWorkflowItem } from '@/features/health/workflow'
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
				if (progress.stage === 'parsed') {
					await updateReportStatus(reportId, { status: 'parsed' })
					await updateQueueStatus(reportId, 'parsed')
				}
			},
		})

		if (outcome.stage === 'failed') {
			throw new Error(outcome.error)
		}

		const processedAt = new Date().toISOString()
		const { healthReport } = outcome

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

		try {
			await transitionWorkflowItem({
				reportId,
				toState: 'READY',
				context: { userId: typedReport.user_id },
			})
		} catch {
			// Workflow optional until migration
		}

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

		createKnowledgeItemFromHealthReport(completedReport)
		invalidateHealthKnowledgeCache(completedReport.user_id)
		await persistHealthKnowledgeGraph(completedReport.user_id, null)
		invalidateAfterHealthImport(completedReport.user_id)

		return completedReport
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Processing failed.'

		await updateReportStatus(reportId, {
			status: 'failed',
			processing_error: message,
		})

		await updateQueueStatus(reportId, 'failed', {
			completed_at: new Date().toISOString(),
			error_message: message,
		})

		try {
			await transitionWorkflowItem({
				reportId,
				toState: 'FAILED',
				context: {
					userId: typedReport.user_id,
					failureReason: message,
				},
			})
		} catch {
			// Workflow optional until migration
		}

		throw new Error(message)
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
