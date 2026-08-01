import type {
	HealthKnowledgeMetric,
	HealthKnowledgeReportRef,
	HealthKnowledgeSummary,
	HealthKnowledgeTimelineEvent,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types/health-knowledge.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

export function buildKnowledgeTimeline(input: {
	reports: HealthKnowledgeReportRef[]
	metrics: HealthKnowledgeMetric[]
	graph: HealthKnowledgeGraph
}): HealthKnowledgeTimelineEvent[] {
	const events: HealthKnowledgeTimelineEvent[] = []

	for (const report of input.reports) {
		const evidenceIds = [`report-${report.id}`]

		if (report.badgeStatus === 'partial' || report.needsReprocess) {
			events.push({
				id: `timeline-partial-${report.id}`,
				type: 'report_partial',
				title: report.title,
				description: report.needsReprocess
					? 'Report needs reprocessing for complete metrics.'
					: 'Report has partially classified metrics.',
				date: report.date,
				evidenceIds,
				reportId: report.id,
			})
		} else if (report.isDisplayReady) {
			events.push({
				id: `timeline-import-${report.id}`,
				type: 'report_imported',
				title: report.title,
				description: `${report.classifiedCount} laboratory metrics extracted from ${report.lab || 'report'}.`,
				date: report.date,
				evidenceIds,
				reportId: report.id,
			})
		}
	}

	for (const metric of input.metrics) {
		if (!ABNORMAL.has(metric.status)) {
			continue
		}

		const evidenceIds = [`metric-${metric.id}`, `report-${metric.reportId}`]
		const type =
			metric.status === 'critical' ? 'metric_critical' : 'metric_abnormal'

		events.push({
			id: `timeline-${type}-${metric.id}`,
			type,
			title: metric.displayName,
			description: `${metric.displayName}: ${metric.value}${metric.unit ? ` ${metric.unit}` : ''} (${metric.status}).`,
			date: metric.observedAt,
			evidenceIds,
			reportId: metric.reportId,
			metricId: metric.canonicalId,
		})
	}

	for (const history of input.graph.profile.metricHistories) {
		if (history.observations.length < 2) {
			continue
		}

		const latest = history.observations[history.observations.length - 1]
		const evidenceIds = history.observations.map(
			(observation) => `metric-${observation.id}`,
		)

		if (
			history.trend.direction === 'improving' &&
			ABNORMAL.has(latest.status) === false
		) {
			events.push({
				id: `timeline-improved-${history.canonicalMetricId}`,
				type: 'metric_improved',
				title: history.displayName,
				description:
					history.trend.description || `${history.displayName} is improving.`,
				date: latest.observedAt,
				evidenceIds,
				metricId: history.canonicalMetricId,
				reportId: latest.reportId,
			})
		}

		if (
			history.trend.direction === 'declining' ||
			history.trend.direction === 'rapid_change'
		) {
			events.push({
				id: `timeline-declined-${history.canonicalMetricId}`,
				type: 'metric_declined',
				title: history.displayName,
				description:
					history.trend.description || `${history.displayName} is declining.`,
				date: latest.observedAt,
				evidenceIds,
				metricId: history.canonicalMetricId,
				reportId: latest.reportId,
			})
		}
	}

	return events.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	)
}

export function buildDeterministicSummary(input: {
	reports: HealthKnowledgeReportRef[]
	metrics: HealthKnowledgeMetric[]
	criticalCount: number
	abnormalCount: number
	latestReport: HealthKnowledgeReportRef | null
}): HealthKnowledgeSummary {
	const reportCount = input.reports.filter(
		(report) => report.isDisplayReady,
	).length
	const metricCount = input.metrics.length
	const lines: string[] = []

	if (reportCount === 0) {
		return {
			headline: 'No health reports available.',
			lines: ['Import laboratory reports to build health knowledge.'],
			metricCount: 0,
			abnormalCount: 0,
			criticalCount: 0,
			reportCount: 0,
		}
	}

	if (input.latestReport) {
		lines.push(`Latest report imported: ${input.latestReport.title}.`)
	}

	lines.push(
		`${metricCount} laboratory metric${metricCount === 1 ? '' : 's'} extracted.`,
	)

	if (input.abnormalCount > 0) {
		lines.push(
			`${input.abnormalCount} abnormal finding${input.abnormalCount === 1 ? '' : 's'}.`,
		)
	} else {
		lines.push('No abnormal findings detected.')
	}

	if (input.criticalCount > 0) {
		lines.push(
			`${input.criticalCount} critical marker${input.criticalCount === 1 ? '' : 's'} detected.`,
		)
	} else {
		lines.push('No critical markers detected.')
	}

	const headline =
		input.criticalCount > 0
			? `${input.criticalCount} critical marker${input.criticalCount === 1 ? '' : 's'} require attention.`
			: input.abnormalCount > 0
				? `${input.abnormalCount} abnormal finding${input.abnormalCount === 1 ? '' : 's'} in latest data.`
				: 'Health knowledge assembled from imported reports.'

	return {
		headline,
		lines,
		metricCount,
		abnormalCount: input.abnormalCount,
		criticalCount: input.criticalCount,
		reportCount,
	}
}
