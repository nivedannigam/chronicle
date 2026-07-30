import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type {
	LongitudinalHealthProfile,
	ProfileMetricEntry,
} from '@/features/health-intelligence/types/health-profile.types'

/** Priority metrics for the longitudinal health profile */
export const PRIORITY_METRIC_IDS = [
	'height',
	'weight',
	'systolic-bp',
	'diastolic-bp',
	'hba1c',
	'fasting-glucose',
	'random-glucose',
	'vitamin-d',
	'vitamin-b12',
	'creatinine',
	'egfr',
	'alt',
	'ast',
	'ggt',
	'bilirubin',
	'total-cholesterol',
	'hdl',
	'ldl',
	'triglycerides',
	'tsh',
	'hemoglobin',
	'wbc',
	'rbc',
	'platelet-count',
	'iron',
	'ferritin',
	'esr',
	'crp',
] as const

function trendLabel(direction: string): string {
	switch (direction) {
		case 'improving':
			return 'Improving'
		case 'declining':
		case 'rapid_change':
			return 'Needs attention'
		case 'stable':
			return 'Stable'
		default:
			return 'Insufficient history'
	}
}

function historyYears(observations: { observedAt: string }[]): number[] {
	return [
		...new Set(
			observations.map((obs) => new Date(obs.observedAt).getFullYear()),
		),
	].sort()
}

function historyToProfileEntry(
	history: HealthKnowledgeGraph['profile']['metricHistories'][number],
): ProfileMetricEntry {
	const latest = history.observations[history.observations.length - 1]

	return {
		canonicalId: history.canonicalMetricId,
		displayName: history.displayName,
		categoryId: history.categoryId,
		latestValue: history.baseline.latestValueLabel,
		unit: history.unit,
		status: latest?.status ?? 'unknown',
		trend: history.trend.direction,
		trendLabel: trendLabel(history.trend.direction),
		observationCount: history.observations.length,
		firstObservedAt: history.baseline.firstObservedAt,
		lastObservedAt: history.baseline.lastObservedAt,
		historyYears: historyYears(history.observations),
	}
}

export function buildLongitudinalHealthProfile(input: {
	personId: string
	graph: HealthKnowledgeGraph
}): LongitudinalHealthProfile {
	const metrics = input.graph.profile.metricHistories.map(historyToProfileEntry)
	const prioritySet = new Set<string>(PRIORITY_METRIC_IDS)

	const priorityMetrics = PRIORITY_METRIC_IDS.map((id) =>
		metrics.find((metric) => metric.canonicalId === id),
	).filter((metric): metric is ProfileMetricEntry => metric != null)

	const otherMetrics = metrics.filter(
		(metric) => !prioritySet.has(metric.canonicalId),
	)

	return {
		personId: input.personId,
		generatedAt: new Date().toISOString(),
		reportCount: input.graph.profile.reportIds.length,
		metrics,
		priorityMetrics,
		otherMetrics,
	}
}
