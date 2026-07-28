import { useMemo } from 'react'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import type { HealthReport } from '@/features/health/types'
import { formatReportTypeLabel } from '@/features/health/services/health-parsed-report.service'

/** @deprecated Prefer useHealthReportDetail for uploaded reports. */
export function useHealthReport(reportId: string | undefined) {
	const { data: uploadedReports = [] } = useMemberHealthReports()

	return useMemo(() => {
		if (!reportId) {
			return undefined
		}

		const uploaded = uploadedReports.find((report) => report.id === reportId)

		if (!uploaded) {
			return undefined
		}

		const parsed = getParsedHealthReport(uploaded)

		if (!parsed) {
			return undefined
		}

		const report: HealthReport = {
			id: uploaded.id,
			date: parsed.metadata.reportDate ?? uploaded.uploaded_at.slice(0, 10),
			displayDate: parsed.metadata.reportDate
				? formatReportTypeLabel(parsed.metadata.reportType)
				: uploaded.uploaded_at.slice(0, 10),
			lab: parsed.metadata.laboratory,
			category: parsed.metadata
				.reportType as import('@/features/health/types').HealthCategoryId,
			title: uploaded.file_name,
			summary: `${parsed.metrics.length} metrics extracted from uploaded report.`,
			metrics: parsed.metrics.map((metric) => ({
				name: metric.displayName,
				value: metric.value,
				reference: metric.referenceRange?.rawText ?? '',
				status: metric.status,
			})),
			doctorNotes: parsed.metadata.doctorName ?? '',
			recommendations: [],
		}

		return report
	}, [reportId, uploadedReports])
}
