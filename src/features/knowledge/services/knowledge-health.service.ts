import { C } from '@/constants/colors'
import { createKnowledgeItem } from '@/features/knowledge/services/knowledge.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type { KnowledgeItem } from '@/features/knowledge/types'

export function createKnowledgeItemFromHealthReport(
	report: UploadedHealthReport,
): KnowledgeItem {
	const processedAt = report.processed_at ?? report.uploaded_at

	return createKnowledgeItem({
		userId: report.user_id,
		type: 'HealthReport',
		title: report.file_name,
		summary:
			report.extracted_text?.split('\n').slice(0, 2).join(' ') ??
			'Health report uploaded and processed.',
		source: 'health',
		sourceId: report.id,
		tags: ['health', report.report_type],
		confidence: 1,
		metadata: {
			storagePath: report.storage_path,
			reportType: report.report_type,
			reportDate: report.report_date,
			processedAt,
			displayTime: new Date(processedAt).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			}),
			color: C.teal,
		},
	})
}
