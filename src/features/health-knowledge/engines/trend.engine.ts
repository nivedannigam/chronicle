import type {
	HealthObservation,
	HealthTrend,
	HealthTrendDirection,
	MetricBaseline,
} from '@/features/health-knowledge/types'

const RAPID_CHANGE_THRESHOLD = 0.2
const STABLE_THRESHOLD = 0.05

function numericObservations(
	observations: HealthObservation[],
): HealthObservation[] {
	return observations.filter((observation) => observation.numericValue != null)
}

export function calculateBaseline(
	observations: HealthObservation[],
): MetricBaseline {
	const numeric = numericObservations(observations)

	if (numeric.length === 0) {
		const latest = observations[observations.length - 1]

		return {
			latest: null,
			best: null,
			worst: null,
			average: null,
			highest: null,
			lowest: null,
			firstRecorded: null,
			lastRecorded: null,
			latestValueLabel: latest?.value ?? '—',
			firstObservedAt: observations[0]?.observedAt ?? null,
			lastObservedAt: latest?.observedAt ?? null,
		}
	}

	const values = numeric.map((observation) => observation.numericValue!)
	const latestObservation = numeric[numeric.length - 1]

	return {
		latest: latestObservation.numericValue,
		best: Math.min(...values),
		worst: Math.max(...values),
		average: values.reduce((sum, value) => sum + value, 0) / values.length,
		highest: Math.max(...values),
		lowest: Math.min(...values),
		firstRecorded: numeric[0].numericValue,
		lastRecorded: latestObservation.numericValue,
		latestValueLabel: latestObservation.unit
			? `${latestObservation.value} ${latestObservation.unit}`
			: latestObservation.value,
		firstObservedAt: numeric[0].observedAt,
		lastObservedAt: latestObservation.observedAt,
	}
}

export function calculateTrend(observations: HealthObservation[]): HealthTrend {
	const numeric = numericObservations(observations)

	if (numeric.length < 2) {
		return {
			direction: 'unknown',
			changePercent: null,
			dataPointCount: observations.length,
			description: 'Insufficient history',
		}
	}

	const first = numeric[0].numericValue!
	const last = numeric[numeric.length - 1].numericValue!
	const change = last - first
	const changePercent = first !== 0 ? change / Math.abs(first) : null
	const lowerIsBetter = inferLowerIsBetter(
		numeric[numeric.length - 1].canonicalMetricId,
	)

	let direction: HealthTrendDirection = 'unknown'

	if (
		changePercent != null &&
		Math.abs(changePercent) >= RAPID_CHANGE_THRESHOLD
	) {
		direction = 'rapid_change'
	} else if (
		Math.abs(change) < 0.0001 ||
		(changePercent != null && Math.abs(changePercent) <= STABLE_THRESHOLD)
	) {
		direction = 'stable'
	} else if (lowerIsBetter) {
		direction = change < 0 ? 'improving' : 'declining'
	} else {
		direction = change > 0 ? 'improving' : 'declining'
	}

	return {
		direction,
		changePercent,
		dataPointCount: observations.length,
		description: describeTrend(direction, changePercent),
	}
}

function inferLowerIsBetter(metricId: string): boolean {
	return [
		'ldl',
		'creatinine',
		'alt',
		'ast',
		'ggt',
		'hba1c',
		'fasting-glucose',
		'random-glucose',
		'triglycerides',
		'tsh',
	].includes(metricId)
}

function describeTrend(
	direction: HealthTrendDirection,
	changePercent: number | null,
): string {
	switch (direction) {
		case 'improving':
			return `Improving${changePercent != null ? ` (${formatPercent(changePercent)})` : ''}`
		case 'declining':
			return `Declining${changePercent != null ? ` (${formatPercent(changePercent)})` : ''}`
		case 'rapid_change':
			return `Rapid change${changePercent != null ? ` (${formatPercent(changePercent)})` : ''}`
		case 'stable':
			return 'Stable'
		default:
			return 'Unknown'
	}
}

function formatPercent(value: number): string {
	const percent = Math.round(value * 100)

	return `${percent >= 0 ? '+' : ''}${percent}%`
}

export function mapTrendToSnapshotTrend(
	direction: HealthTrendDirection,
): import('@/features/health/types').SnapshotTrend {
	switch (direction) {
		case 'improving':
			return 'improving'
		case 'declining':
		case 'rapid_change':
			return 'declining'
		default:
			return 'stable'
	}
}
