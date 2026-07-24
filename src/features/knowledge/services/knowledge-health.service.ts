import { C } from '@/constants/colors'
import { createKnowledgeItem } from '@/features/knowledge/services/knowledge.service'
import {
	formatReportTypeLabel,
	getParsedHealthReport,
} from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type { KnowledgeItem } from '@/features/knowledge/types'

function buildStructuredSummary(report: UploadedHealthReport): string {
	const parsed = getParsedHealthReport(report)

	if (!parsed) {
		return (
			report.extracted_text?.split('\n').slice(0, 2).join(' ') ??
			'Health report uploaded and processed.'
		)
	}

	const { metadata, metrics } = parsed
	const testSummary = metadata.testNames.slice(0, 4).join(', ')
	const metricCount = metrics.length

	return [
		`${formatReportTypeLabel(metadata.reportType)} from ${metadata.laboratory}.`,
		testSummary
			? `${metricCount} metrics extracted: ${testSummary}.`
			: `${metricCount} metrics extracted.`,
	].join(' ')
}

export function createKnowledgeItemFromHealthReport(
	report: UploadedHealthReport,
): KnowledgeItem {
	const parsed = getParsedHealthReport(report)
	const processedAt = report.processed_at ?? report.uploaded_at
	const title = parsed
		? `${formatReportTypeLabel(parsed.metadata.reportType)} — ${parsed.metadata.laboratory}`
		: report.file_name

	return createKnowledgeItem({
		userId: report.user_id,
		type: 'HealthReport',
		title,
		summary: buildStructuredSummary(report),
		source: 'health',
		sourceId: report.id,
		tags: ['health', report.report_type, ...(parsed?.metadata.testNames ?? [])],
		confidence: report.ocr_confidence ?? 1,
		metadata: {
			storagePath: report.storage_path,
			reportType: report.report_type,
			reportDate: report.report_date,
			processedAt,
			laboratory: parsed?.metadata.laboratory,
			testNames: parsed?.metadata.testNames,
			metricCount: parsed?.metrics.length,
			ocrProvider: report.ocr_provider,
			ocrConfidence: report.ocr_confidence,
			ocrProcessingTimeMs: report.ocr_processing_time_ms,
			displayTime: new Date(processedAt).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			}),
			color: C.teal,
		},
	})
}
