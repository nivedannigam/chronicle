import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	getParsedHealthReport,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import type { DetectedChange } from '@/features/health-insights/types/health-insights.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

function isAbnormal(status: string): boolean {
	return ABNORMAL.has(status)
}

export function detectReportChanges(input: {
	histories: HealthMetricHistory[]
	uploadedReports: UploadedHealthReport[]
}): DetectedChange[] {
	const changes: DetectedChange[] = []

	for (const history of input.histories) {
		if (history.observations.length < 2) {
			continue
		}

		const previous = history.observations[history.observations.length - 2]!
		const current = history.observations[history.observations.length - 1]!

		if (
			history.trend.direction === 'improving' &&
			previous.value !== current.value
		) {
			changes.push({
				id: `change-improved-${history.canonicalMetricId}`,
				kind: 'improved',
				metricId: history.canonicalMetricId,
				displayName: history.displayName,
				description: `Improved ${history.displayName}`,
				previousValue: previous.value,
				currentValue: current.value,
				reportId: current.reportId,
				previousReportId: previous.reportId,
				observedAt: current.observedAt,
			})
		}

		if (
			(history.trend.direction === 'declining' ||
				history.trend.direction === 'rapid_change') &&
			previous.value !== current.value
		) {
			changes.push({
				id: `change-worsening-${history.canonicalMetricId}`,
				kind: 'worsening',
				metricId: history.canonicalMetricId,
				displayName: history.displayName,
				description: `Increasing ${history.displayName}`,
				previousValue: previous.value,
				currentValue: current.value,
				reportId: current.reportId,
				previousReportId: previous.reportId,
				observedAt: current.observedAt,
			})
		}

		if (isAbnormal(previous.status) && !isAbnormal(current.status)) {
			changes.push({
				id: `change-resolved-${history.canonicalMetricId}`,
				kind: 'resolved',
				metricId: history.canonicalMetricId,
				displayName: history.displayName,
				description: `Resolved ${history.displayName} abnormality`,
				previousValue: previous.value,
				currentValue: current.value,
				reportId: current.reportId,
				previousReportId: previous.reportId,
				observedAt: current.observedAt,
			})
		}

		if (!isAbnormal(previous.status) && isAbnormal(current.status)) {
			changes.push({
				id: `change-new-${history.canonicalMetricId}`,
				kind: 'new_finding',
				metricId: history.canonicalMetricId,
				displayName: history.displayName,
				description: `New finding: ${history.displayName}`,
				previousValue: previous.value,
				currentValue: current.value,
				reportId: current.reportId,
				previousReportId: previous.reportId,
				observedAt: current.observedAt,
			})
		}

		if (
			isAbnormal(current.status) &&
			history.observations.filter((obs) => isAbnormal(obs.status)).length >= 2
		) {
			changes.push({
				id: `change-persistent-${history.canonicalMetricId}`,
				kind: 'persistent',
				metricId: history.canonicalMetricId,
				displayName: history.displayName,
				description: `Persistent ${history.displayName} abnormality`,
				currentValue: current.value,
				reportId: current.reportId,
				observedAt: current.observedAt,
			})
		}
	}

	return changes
}

export function buildLatestReportComparison(input: {
	uploadedReports: UploadedHealthReport[]
	changes: DetectedChange[]
}): DetectedChange[] {
	const completed = input.uploadedReports
		.filter((report) => report.status === 'completed')
		.sort(
			(a, b) =>
				new Date(b.report_date ?? b.uploaded_at).getTime() -
				new Date(a.report_date ?? a.uploaded_at).getTime(),
		)

	if (completed.length < 2) {
		return []
	}

	const latest = completed[0]!
	const previous = completed[1]!

	return input.changes.filter(
		(change) =>
			change.reportId === latest.id || change.previousReportId === previous.id,
	)
}

export function reportTitleForId(
	reportId: string,
	uploadedReports: UploadedHealthReport[],
): string {
	const report = uploadedReports.find((item) => item.id === reportId)

	if (!report) {
		return reportId
	}

	return getReportDisplayTitle(report)
}

export function reportDateForId(
	reportId: string,
	uploadedReports: UploadedHealthReport[],
): string | undefined {
	const report = uploadedReports.find((item) => item.id === reportId)

	if (!report) {
		return undefined
	}

	const parsed = getParsedHealthReport(report)

	return parsed?.metadata.reportDate ?? report.report_date ?? report.uploaded_at
}
