import { normalizeMetricName } from '@/features/document-intelligence/extraction/metric-normalization.engine'
import { getHealthReports } from '@/features/health/services/health.service'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import type {
	HealthMetricHistory,
	MetricCategoryId,
} from '@/features/health-knowledge/types'
import type {
	KnowledgeRetriever,
	RetrievalQuery,
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

export class HealthKnowledgeRetriever implements KnowledgeRetriever {
	readonly domain = 'health' as const

	retrieve(query: RetrievalQuery): RetrievedKnowledge {
		const graph = healthKnowledgeService.getGraphForUser(
			query.userId,
			query.uploadedReports ?? [],
		)
		const profile = graph.profile
		const categoryId = mapCategoryId(query.categoryId)
		const metricId = query.metricId ?? resolveMetricId(query.metricName)
		const years = query.timeRangeYears

		let histories = profile.metricHistories

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

		const reports: RetrievedReport[] = getHealthReports()
			.filter((report) => {
				if (!categoryId) {
					return profile.reportIds.includes(report.id)
				}

				return (
					report.category === categoryId || report.category === query.categoryId
				)
			})
			.slice(0, 6)
			.map((report) => ({
				id: report.id,
				title: report.title,
				date: report.displayDate,
				lab: report.lab,
				category: report.category,
				summary: report.summary,
			}))

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

		const insights = profile.insights.map((insight) => insight.text)
		const alerts = profile.alerts.map((alert) => alert.message)

		const summaryLines = buildSummaryLines(query.intent, {
			metrics,
			timelines,
			trends,
			reports,
			insights,
			alerts,
		})

		return {
			domain: 'health',
			intent: query.intent,
			reports,
			metrics,
			timelines,
			trends,
			observations,
			relationships: profile.relationships.map((relationship) => ({
				id: relationship.id,
				fromMetricId: relationship.fromMetricId,
				toMetricId: relationship.toMetricId,
				label: relationship.label,
			})),
			insights,
			alerts,
			summaryLines,
		}
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
		default:
			lines.push(...data.insights.slice(0, 4))
			break
	}

	if (lines.length === 0) {
		lines.push(...data.insights.slice(0, 3))
	}

	return lines
}

export const healthKnowledgeRetriever = new HealthKnowledgeRetriever()
