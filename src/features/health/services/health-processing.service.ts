import { supabase } from '@/lib/supabase'
import { createKnowledgeItemFromHealthReport } from '@/features/knowledge/services/knowledge-health.service'
import type {
	HealthReportStatus,
	UploadedHealthReport,
} from '@/features/health/types'

function placeholderExtractedText(report: UploadedHealthReport): string {
	return [
		'[Placeholder extraction]',
		`Document: ${report.file_name}`,
		`Uploaded: ${report.uploaded_at}`,
		'',
		'Text extraction will be available in a future release.',
	].join('\n')
}

async function updateReportStatus(
	reportId: string,
	updates: Partial<
		Pick<
			UploadedHealthReport,
			'status' | 'extracted_text' | 'processed_at' | 'processing_error'
		>
	>,
) {
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
		.insert({
			report_id: reportId,
			user_id: userId,
			status: 'queued',
		})

	if (error) {
		throw new Error(error.message)
	}
}

export async function processHealthReport(
	reportId: string,
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

	if (typedReport.status === 'ready') {
		createKnowledgeItemFromHealthReport(typedReport)
		return typedReport
	}

	if (typedReport.status === 'processing') {
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

		// Placeholder text extraction — real OCR will replace this step
		const extractedText = placeholderExtractedText(typedReport)
		const processedAt = new Date().toISOString()

		await updateReportStatus(reportId, {
			status: 'ready',
			extracted_text: extractedText,
			processed_at: processedAt,
			processing_error: null,
		})

		await updateQueueStatus(reportId, 'ready', {
			completed_at: processedAt,
			error_message: null,
		})

		const readyReport: UploadedHealthReport = {
			...typedReport,
			status: 'ready',
			extracted_text: extractedText,
			processed_at: processedAt,
			processing_error: null,
		}

		createKnowledgeItemFromHealthReport(readyReport)

		return readyReport
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

		throw new Error(message)
	}
}

export function processPendingHealthReports(
	reports: UploadedHealthReport[],
): Promise<void> {
	const pending = reports.filter((report) => report.status === 'queued')

	return pending.reduce(async (chain, report) => {
		await chain

		try {
			await processHealthReport(report.id)
		} catch {
			// Individual failures are persisted on the report row
		}
	}, Promise.resolve())
}

export function getHealthReportStatusLabel(status: HealthReportStatus): string {
	switch (status) {
		case 'queued':
			return 'Queued'
		case 'processing':
			return 'Processing'
		case 'ready':
			return 'Ready'
		case 'failed':
			return 'Failed'
	}
}

export function hasPendingProcessing(reports: UploadedHealthReport[]): boolean {
	return reports.some(
		(report) => report.status === 'queued' || report.status === 'processing',
	)
}
