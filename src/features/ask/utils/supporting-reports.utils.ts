import type { TrustResponse } from '@/features/ask/trust/trust.types'

export interface SupportingReportGroup {
	id: string
	title: string
	date: string
	metrics: string[]
}

/** Groups trust evidence into report-level summaries for collapsed UI. */
export function groupSupportingReports(
	trust: TrustResponse | undefined,
): SupportingReportGroup[] {
	if (!trust) {
		return []
	}

	const reports = new Map<string, SupportingReportGroup>()

	for (const item of trust.evidenceItems) {
		const existing = reports.get(item.reportId) ?? {
			id: item.reportId,
			title: item.reportTitle,
			date: item.reportDate,
			metrics: [],
		}

		if (item.metricName) {
			const metricLine = item.metricValue
				? `${item.metricName}: ${item.metricValue}`
				: item.metricName

			if (!existing.metrics.includes(metricLine)) {
				existing.metrics.push(metricLine)
			}
		}

		reports.set(item.reportId, existing)
	}

	for (const report of trust.supportingReports) {
		if (!reports.has(report.id)) {
			reports.set(report.id, {
				id: report.id,
				title: report.title,
				date: report.date,
				metrics: [],
			})
		}
	}

	return Array.from(reports.values())
}
