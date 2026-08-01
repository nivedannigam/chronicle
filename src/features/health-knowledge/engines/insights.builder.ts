import type {
	HealthKnowledgeInsight,
	HealthKnowledgeMetric,
	HealthKnowledgeRecommendation,
	HealthKnowledgeTrendPoint,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types/health-knowledge.types'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

export function buildKnowledgeInsights(input: {
	graph: HealthKnowledgeGraph
	metrics: HealthKnowledgeMetric[]
	coverage: HealthCoverageSnapshot
}): HealthKnowledgeInsight[] {
	const insights: HealthKnowledgeInsight[] = []

	for (const derived of input.graph.profile.insights) {
		insights.push({
			id: derived.id,
			text: derived.text,
			tone: derived.tone,
			metricId: derived.metricId,
			evidenceIds: derived.metricId ? [`metric-${derived.metricId}`] : [],
		})
	}

	for (const alert of input.graph.profile.alerts) {
		insights.push({
			id: alert.id,
			text: alert.message,
			tone: alert.severity === 'critical' ? 'warning' : 'neutral',
			metricId: alert.metricId,
			evidenceIds: [`metric-${alert.metricId}`, `report-${alert.reportId}`],
		})
	}

	if (input.coverage.displayReadyCount === 0) {
		insights.push({
			id: 'insight-no-data',
			text: 'Import health reports to unlock insights.',
			tone: 'neutral',
			evidenceIds: [],
		})
	}

	return dedupeInsights(insights).slice(0, 12)
}

export function buildKnowledgeRecommendations(input: {
	metrics: HealthKnowledgeMetric[]
	coverage: HealthCoverageSnapshot
	limitationCodes: Set<string>
}): HealthKnowledgeRecommendation[] {
	const recommendations: HealthKnowledgeRecommendation[] = []

	if (input.coverage.reportsNeedingReprocess.length > 0) {
		recommendations.push({
			id: 'rec-reprocess',
			text: 'Reprocess reports with incomplete metrics to improve knowledge coverage.',
			priority: 'high',
			evidenceIds: input.coverage.reportsNeedingReprocess.map(
				(id) => `report-${id}`,
			),
		})
	}

	if (input.coverage.failedCount > 0) {
		recommendations.push({
			id: 'rec-import-failures',
			text: 'Review Import Center for failed files and retry or skip unsupported documents.',
			priority: 'high',
			evidenceIds: ['coverage-import-failures'],
		})
	}

	const criticalMetrics = input.metrics.filter(
		(metric) => metric.status === 'critical',
	)

	for (const metric of criticalMetrics.slice(0, 3)) {
		recommendations.push({
			id: `rec-critical-${metric.canonicalId}`,
			text: `Discuss ${metric.displayName} (${metric.value}${metric.unit ? ` ${metric.unit}` : ''}) with your clinician.`,
			priority: 'high',
			evidenceIds: [`metric-${metric.id}`, `report-${metric.reportId}`],
		})
	}

	const abnormalNonCritical = input.metrics.filter(
		(metric) => ABNORMAL.has(metric.status) && metric.status !== 'critical',
	)

	for (const metric of abnormalNonCritical.slice(0, 2)) {
		recommendations.push({
			id: `rec-abnormal-${metric.canonicalId}`,
			text: `Monitor ${metric.displayName} — currently ${metric.status}.`,
			priority: 'medium',
			evidenceIds: [`metric-${metric.id}`],
		})
	}

	if (input.limitationCodes.has('single_report')) {
		recommendations.push({
			id: 'rec-add-reports',
			text: 'Import additional reports to enable trend analysis and comparison.',
			priority: 'low',
			evidenceIds: [],
		})
	}

	return recommendations.slice(0, 8)
}

export function buildTrendAnalysis(
	graph: HealthKnowledgeGraph,
): HealthKnowledgeTrendPoint[] {
	return graph.profile.metricHistories
		.filter((history) => history.observations.length >= 2)
		.map((history) => {
			const isActionable =
				history.trend.direction !== 'unknown' &&
				history.trend.dataPointCount >= 2

			let clinicalScore = 0

			if (isActionable) {
				clinicalScore += 50

				if (
					history.trend.direction === 'declining' ||
					history.trend.direction === 'rapid_change'
				) {
					clinicalScore += 40
				} else if (history.trend.direction === 'improving') {
					clinicalScore += 25
				}
			}

			return {
				metricId: history.canonicalMetricId,
				displayName: history.displayName,
				direction: history.trend.direction,
				changePercent: history.trend.changePercent,
				dataPointCount: history.trend.dataPointCount,
				isActionable,
				clinicalScore,
				evidenceIds: history.observations.map(
					(observation) => `metric-${observation.id}`,
				),
			}
		})
		.filter((trend) => trend.isActionable)
		.sort((a, b) => b.clinicalScore - a.clinicalScore)
}

function dedupeInsights(
	insights: HealthKnowledgeInsight[],
): HealthKnowledgeInsight[] {
	const seen = new Set<string>()
	const result: HealthKnowledgeInsight[] = []

	for (const insight of insights) {
		const key = `${insight.text}::${insight.metricId ?? ''}`

		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		result.push(insight)
	}

	return result
}
