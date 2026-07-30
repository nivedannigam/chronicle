import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import { buildLongitudinalHealthProfile } from '@/features/health-intelligence/services/health-profile.service'
import { buildHealthSummary } from '@/features/health-intelligence/services/health-summary.service'
import type {
	HealthMetricHistory,
	MetricCategoryId,
} from '@/features/health-knowledge/types'
import type {
	MetricStatus,
	UploadedHealthReport,
} from '@/features/health/types'
import { topReportIdsFromHits } from '@/features/intelligence/services/search-ranking.service'
import { semanticMemoryService } from '@/features/semantic-memory/memory/semantic-memory.service'
import type {
	KnowledgeRetriever,
	RetrievalQuery,
	RetrievedComparison,
	RetrievedKnowledge,
	RetrievedMetric,
	RetrievedObservation,
	RetrievedReport,
	RetrievedTimeline,
	RetrievedTrend,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'

function formatDate(value: string): string {
	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function formatPercent(value: number | null): string {
	if (value == null) {
		return '—'
	}

	return `${Math.round(value * 100)}%`
}

function mapCategoryId(categoryId?: string): MetricCategoryId | undefined {
	if (!categoryId) {
		return undefined
	}

	const aliases: Record<string, MetricCategoryId> = {
		liver: 'liver',
		heart: 'heart',
		kidney: 'kidney',
		diabetes: 'diabetes',
		thyroid: 'thyroid',
		vitamin: 'vitamin',
		vitamins: 'vitamin',
		blood: 'blood',
		'blood-count': 'blood',
		general: 'blood',
	}

	return aliases[categoryId]
}

function resolveMetricId(metricName?: string): string | undefined {
	if (!metricName) {
		return undefined
	}

	return normalizeMetricName(metricName).canonicalId ?? undefined
}

function withinYears(observedAt: string, years?: number): boolean {
	if (!years) {
		return true
	}

	const cutoff = new Date()
	cutoff.setFullYear(cutoff.getFullYear() - years)

	return new Date(observedAt).getTime() >= cutoff.getTime()
}

function historyToTimeline(
	history: HealthMetricHistory,
	years?: number,
): RetrievedTimeline {
	const observations = history.observations
		.filter((observation) => withinYears(observation.observedAt, years))
		.map((observation): RetrievedObservation => ({
			id: observation.id,
			metricId: history.canonicalMetricId,
			displayName: history.displayName,
			value: observation.value,
			status: observation.status,
			observedAt: observation.observedAt,
			reportId: observation.reportId,
			reportTitle: observation.reportTitle,
			referenceRange: observation.referenceRange,
		}))

	return {
		metricId: history.canonicalMetricId,
		displayName: history.displayName,
		unit: history.unit,
		trend: history.trend.description,
		observations,
		baseline: {
			latest: history.baseline.latestValueLabel,
			lowest:
				history.baseline.lowest != null
					? String(history.baseline.lowest)
					: null,
			highest:
				history.baseline.highest != null
					? String(history.baseline.highest)
					: null,
			firstRecorded:
				history.baseline.firstObservedAt != null
					? formatDate(history.baseline.firstObservedAt)
					: null,
			lastRecorded:
				history.baseline.lastObservedAt != null
					? formatDate(history.baseline.lastObservedAt)
					: null,
		},
	}
}

function latestMetricFromHistory(
	history: HealthMetricHistory,
): RetrievedMetric | null {
	const latest = history.observations[history.observations.length - 1]

	if (!latest) {
		return null
	}

	return {
		canonicalId: history.canonicalMetricId,
		displayName: history.displayName,
		latestValue: latest.value,
		unit: history.unit,
		status: latest.status,
		referenceRange: latest.referenceRange,
		trend: history.trend.description,
		categoryId: history.categoryId,
		reportId: latest.reportId,
		reportTitle: latest.reportTitle,
		observedAt: latest.observedAt,
	}
}

function buildReportsFromUploads(
	uploadedReports: UploadedHealthReport[],
	prioritizedReportIds: string[] = [],
): RetrievedReport[] {
	const completed = uploadedReports.filter(
		(report) => report.status === 'completed',
	)

	const prioritized = new Set(prioritizedReportIds)
	const ordered = [
		...completed.filter((report) => prioritized.has(report.id)),
		...completed
			.filter((report) => !prioritized.has(report.id))
			.sort(
				(a, b) =>
					new Date(b.report_date ?? b.uploaded_at).getTime() -
					new Date(a.report_date ?? a.uploaded_at).getTime(),
			),
	]

	return ordered.slice(0, 6).map((report) => {
		const parsed = getParsedHealthReport(report)

		return {
			id: report.id,
			title: getReportDisplayTitle(report),
			date: getReportDisplayDate(report, parsed),
			lab: parsed?.metadata.laboratory ?? '',
			category: parsed?.metadata.reportType ?? report.report_type ?? 'general',
			summary: parsed
				? `${parsed.metrics.length} extracted metrics`
				: report.file_name,
		}
	})
}

function mapComparisonStatus(value: string): MetricStatus {
	switch (value) {
		case 'low':
			return 'low'
		case 'high':
		case 'borderline':
			return 'high'
		case 'critical':
			return 'critical'
		default:
			return 'normal'
	}
}

function buildReportComparison(
	reports: RetrievedReport[],
	histories: HealthMetricHistory[],
): RetrievedComparison | null {
	if (reports.length < 2) {
		return null
	}

	const older = reports[1]!
	const newer = reports[0]!
	const sharedMetrics = histories
		.filter((history) => history.observations.length >= 2)
		.slice(0, 6)
		.map((history) => {
			const previous = history.observations[history.observations.length - 2]!
			const latest = history.observations[history.observations.length - 1]!

			return {
				metric: history.displayName,
				oldValue: previous.value,
				newValue: latest.value,
				difference: `${previous.value} → ${latest.value}`,
				status: mapComparisonStatus(latest.status),
			}
		})

	if (sharedMetrics.length === 0) {
		return null
	}

	return {
		id: `${older.id}-${newer.id}`,
		label: 'Report comparison',
		olderLabel: `${older.title} · ${older.date}`,
		newerLabel: `${newer.title} · ${newer.date}`,
		metrics: sharedMetrics,
	}
}

export class HealthKnowledgeRetriever implements KnowledgeRetriever {
	readonly domain = 'health' as const

	retrieve(query: RetrievalQuery): RetrievedKnowledge {
		const graph = healthKnowledgeService.getGraphForUser(
			query.userId,
			query.uploadedReports ?? [],
		)
		const personProfile = graph.profile
		const categoryId = mapCategoryId(query.categoryId)
		const metricId = query.metricId ?? resolveMetricId(query.metricName)
		const years = query.timeRangeYears

		let histories = personProfile.metricHistories

		if (categoryId) {
			histories = histories.filter(
				(history) => history.categoryId === categoryId,
			)
		}

		if (metricId) {
			histories = histories.filter(
				(history) => history.canonicalMetricId === metricId,
			)
		}

		const prioritizedReportIds = topReportIdsFromHits(query.searchHits ?? [])
		const reports = buildReportsFromUploads(
			query.uploadedReports ?? [],
			prioritizedReportIds,
		)

		const metrics = histories
			.map((history) => latestMetricFromHistory(history))
			.filter((metric): metric is RetrievedMetric => metric != null)

		const timelines = histories.map((history) =>
			historyToTimeline(history, years),
		)
		const observations = timelines.flatMap((timeline) => timeline.observations)

		const trends: RetrievedTrend[] = histories.map((history) => ({
			metricId: history.canonicalMetricId,
			displayName: history.displayName,
			direction: history.trend.direction,
			changePercent: formatPercent(history.trend.changePercent),
			dataPointCount: history.trend.dataPointCount,
			latestValue: history.baseline.latestValueLabel,
		}))

		const insights = personProfile.insights.map((insight) => insight.text)
		const alerts = personProfile.alerts.map((alert) => alert.message)

		const longitudinalProfile = buildLongitudinalHealthProfile({
			personId: query.userId,
			graph,
		})
		const healthSummary = buildHealthSummary({
			graph,
			profile: longitudinalProfile,
			insights: [],
			statusLabel: 'Looking Good',
		})

		const summaryLines = [
			healthSummary.headline,
			...healthSummary.bullets,
			...buildSummaryLines(query.intent, {
				metrics,
				timelines,
				trends,
				reports,
				insights,
				alerts,
			}),
		].filter(Boolean)

		const comparisons: RetrievedComparison[] = []

		if (query.intent === 'compare_reports') {
			const comparison = buildReportComparison(reports, histories)

			if (comparison) {
				comparisons.push(comparison)
			}
		}

		const baseKnowledge = {
			domain: 'health' as const,
			intent: query.intent,
			reports,
			metrics,
			timelines,
			trends,
			observations,
			relationships: personProfile.relationships.map((relationship) => ({
				id: relationship.id,
				fromMetricId: relationship.fromMetricId,
				toMetricId: relationship.toMetricId,
				label: relationship.label,
			})),
			insights,
			alerts,
			summaryLines,
			comparisons,
		}

		const memory = semanticMemoryService.getSemanticMemory({
			personId: query.member?.memberId ?? query.userId,
			userId: query.userId,
			uploadedReports: query.uploadedReports,
		})

		return semanticMemoryService.enrichRetrievedKnowledge({
			knowledge: baseKnowledge,
			memory,
			intent: query.intent,
			categoryId,
			userId: query.userId,
			uploadedReports: query.uploadedReports,
		})
	}
}

function buildSummaryLines(
	intent: RetrievalQuery['intent'],
	data: {
		metrics: RetrievedMetric[]
		timelines: RetrievedTimeline[]
		trends: RetrievedTrend[]
		reports: RetrievedReport[]
		insights: string[]
		alerts: string[]
	},
): string[] {
	const lines: string[] = []

	switch (intent) {
		case 'abnormal_reports':
			lines.push(
				...data.metrics
					.filter(
						(metric) =>
							metric.status === 'low' ||
							metric.status === 'high' ||
							metric.status === 'critical' ||
							metric.status === 'borderline',
					)
					.map(
						(metric) =>
							`${metric.displayName}: ${metric.latestValue} (${metric.status}) in ${metric.reportTitle}`,
					),
			)
			break
		case 'improving_metrics':
			lines.push(
				...data.trends
					.filter((trend) => trend.direction === 'improving')
					.map(
						(trend) =>
							`${trend.displayName}: ${trend.direction} (${trend.changePercent}) — latest ${trend.latestValue}`,
					),
			)
			break
		case 'declining_metrics':
			lines.push(
				...data.trends
					.filter(
						(trend) =>
							trend.direction === 'declining' ||
							trend.direction === 'rapid_change',
					)
					.map(
						(trend) =>
							`${trend.displayName}: ${trend.direction} (${trend.changePercent}) — latest ${trend.latestValue}`,
					),
			)
			break
		case 'metric_history':
		case 'metric_trend':
			for (const timeline of data.timelines) {
				lines.push(
					`${timeline.displayName}: ${timeline.observations
						.map(
							(observation) =>
								`${observation.value} (${formatDate(observation.observedAt)})`,
						)
						.join(' → ')}`,
				)
			}
			break
		case 'organ_status':
			lines.push(
				...data.metrics.map(
					(metric) =>
						`${metric.displayName}: ${metric.latestValue} (${metric.status}) in ${metric.reportTitle}`,
				),
			)
			break
		default:
			lines.push(...data.insights.slice(0, 4))
			break
	}

	if (lines.length === 0) {
		if (data.metrics.length > 0) {
			lines.push(
				...data.metrics
					.slice(0, 3)
					.map(
						(metric) =>
							`${metric.displayName}: ${metric.latestValue} (${metric.status})`,
					),
			)
		} else {
			lines.push(...data.insights.slice(0, 3))
		}
	}

	return lines
}

export const healthKnowledgeRetriever = new HealthKnowledgeRetriever()
