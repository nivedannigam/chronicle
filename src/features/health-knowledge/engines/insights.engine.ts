import type {
	DerivedHealthInsight,
	HealthMetricHistory,
	HealthTrendDirection,
} from '@/features/health-knowledge/types'

function trendScore(direction: HealthTrendDirection): number {
	switch (direction) {
		case 'improving':
			return 1
		case 'stable':
			return 0
		case 'declining':
			return -1
		case 'rapid_change':
			return -2
		default:
			return 0
	}
}

export function buildDerivedInsights(
	metricHistories: HealthMetricHistory[],
	abnormalReportCount: number,
): DerivedHealthInsight[] {
	const insights: DerivedHealthInsight[] = []
	const withHistory = metricHistories.filter(
		(history) => history.observations.length > 0,
	)
	const improving = withHistory.filter(
		(history) => history.trend.direction === 'improving',
	)
	const needingAttention = withHistory.filter((history) => {
		const latest = history.observations[history.observations.length - 1]

		return (
			latest?.status === 'low' ||
			latest?.status === 'high' ||
			latest?.status === 'critical' ||
			latest?.status === 'borderline' ||
			history.trend.direction === 'declining' ||
			history.trend.direction === 'rapid_change'
		)
	})

	const longestImproving = [...improving].sort(
		(a, b) => b.observations.length - a.observations.length,
	)[0]

	const worsening = withHistory.filter(
		(history) =>
			history.trend.direction === 'declining' ||
			history.trend.direction === 'rapid_change',
	)
	const longestWorsening = [...worsening].sort(
		(a, b) => b.observations.length - a.observations.length,
	)[0]

	if (abnormalReportCount > 0) {
		insights.push({
			id: 'insight-abnormal-reports',
			text: `${abnormalReportCount} report${abnormalReportCount === 1 ? '' : 's'} contain abnormal metric values.`,
			tone: 'warning',
		})
	}

	if (improving.length > 0) {
		insights.push({
			id: 'insight-improving-count',
			text: `${improving.length} metric${improving.length === 1 ? '' : 's'} show improving trends.`,
			tone: 'positive',
		})
	}

	if (needingAttention.length > 0) {
		insights.push({
			id: 'insight-attention',
			text: `${needingAttention.length} metric${needingAttention.length === 1 ? '' : 's'} need attention based on latest values or trends.`,
			tone: 'warning',
		})
	}

	if (longestImproving) {
		insights.push({
			id: 'insight-longest-improving',
			text: `${longestImproving.displayName} has the longest improving history (${longestImproving.observations.length} readings).`,
			tone: 'positive',
			metricId: longestImproving.canonicalMetricId,
		})
	}

	if (longestWorsening) {
		insights.push({
			id: 'insight-longest-worsening',
			text: `${longestWorsening.displayName} shows the longest worsening pattern (${longestWorsening.observations.length} readings).`,
			tone: 'warning',
			metricId: longestWorsening.canonicalMetricId,
		})
	}

	const scored = withHistory.filter(
		(history) => history.trend.direction !== 'unknown',
	)

	if (scored.length > 0) {
		const average =
			scored.reduce(
				(sum, history) => sum + trendScore(history.trend.direction),
				0,
			) / scored.length

		const label =
			average > 0.25
				? 'Overall metric trends are improving.'
				: average < -0.25
					? 'Overall metric trends are declining.'
					: 'Overall metric trends are stable.'

		insights.push({
			id: 'insight-average-trend',
			text: label,
			tone:
				average > 0.25 ? 'positive' : average < -0.25 ? 'warning' : 'neutral',
		})
	}

	return insights.slice(0, 6)
}
