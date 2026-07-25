import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import type {
	MetricHistoryRecord,
	SemanticInsight,
} from '@/features/semantic-memory/types/semantic-memory.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])
const FOLLOW_UP_MONTHS = 12

function isAbnormal(status: string): boolean {
	return ABNORMAL.has(status)
}

function monthsSince(date: string): number {
	const diff = Date.now() - new Date(date).getTime()

	return diff / (1000 * 60 * 60 * 24 * 30)
}

export function buildSemanticInsights(input: {
	histories: HealthMetricHistory[]
	metricHistories: MetricHistoryRecord[]
	abnormalReportCount: number
}): SemanticInsight[] {
	const insights: SemanticInsight[] = []

	for (const history of input.metricHistories) {
		if (
			history.previousStatus &&
			isAbnormal(history.previousStatus) &&
			!isAbnormal(history.latestStatus)
		) {
			insights.push({
				id: `resolved-${history.canonicalId}`,
				kind: 'resolved_abnormality',
				text: `${history.displayName} normalized from ${history.previousValue} to ${history.latestValue}.`,
				metricId: history.canonicalId,
				categoryId: history.categoryId,
				evidenceReportIds: history.linkedReportIds.slice(-2),
			})
		}

		if (
			history.previousStatus &&
			!isAbnormal(history.previousStatus) &&
			isAbnormal(history.latestStatus)
		) {
			insights.push({
				id: `new-abnormal-${history.canonicalId}`,
				kind: 'new_abnormality',
				text: `${history.displayName} is newly abnormal at ${history.latestValue} (${history.latestStatus}).`,
				metricId: history.canonicalId,
				categoryId: history.categoryId,
				evidenceReportIds: history.linkedReportIds.slice(-1),
			})
		}

		if (history.trendDirection === 'improving' && history.dataPointCount >= 2) {
			insights.push({
				id: `improving-${history.canonicalId}`,
				kind: 'improving_trend',
				text: `${history.displayName} shows an improving trend (${history.changePercent} change across ${history.dataPointCount} readings).`,
				metricId: history.canonicalId,
				categoryId: history.categoryId,
				evidenceReportIds: history.linkedReportIds,
			})
		}

		if (
			(history.trendDirection === 'declining' ||
				history.trendDirection === 'rapid_change') &&
			history.dataPointCount >= 3
		) {
			insights.push({
				id: `persistent-${history.canonicalId}`,
				kind: 'persistent_trend',
				text: `${history.displayName} shows a persistent ${history.trendDirection} pattern across ${history.dataPointCount} readings.`,
				metricId: history.canonicalId,
				categoryId: history.categoryId,
				evidenceReportIds: history.linkedReportIds,
			})
		}

		if (
			history.latestObservedAt &&
			monthsSince(history.latestObservedAt) > FOLLOW_UP_MONTHS &&
			history.dataPointCount >= 1
		) {
			insights.push({
				id: `follow-up-${history.canonicalId}`,
				kind: 'missing_follow_up',
				text: `${history.displayName} has not been measured in over ${FOLLOW_UP_MONTHS} months (last: ${history.latestObservedAt.slice(0, 10)}).`,
				metricId: history.canonicalId,
				categoryId: history.categoryId,
				evidenceReportIds: history.linkedReportIds.slice(-1),
			})
		}
	}

	if (input.abnormalReportCount > 0) {
		insights.push({
			id: 'summary-abnormal-reports',
			kind: 'summary',
			text: `${input.abnormalReportCount} report${input.abnormalReportCount === 1 ? '' : 's'} contain abnormal values in your Chronicle records.`,
			evidenceReportIds: [],
		})
	}

	const resolved = insights.filter(
		(item) => item.kind === 'resolved_abnormality',
	)

	if (resolved.length > 0) {
		insights.push({
			id: 'summary-resolved',
			kind: 'summary',
			text: `${resolved.length} metric${resolved.length === 1 ? '' : 's'} show resolved abnormalities.`,
			evidenceReportIds: resolved.flatMap((item) => item.evidenceReportIds),
		})
	}

	return insights.slice(0, 10)
}

export function insightsForIntent(
	insights: SemanticInsight[],
	intent: string,
): SemanticInsight[] {
	switch (intent) {
		case 'improving_metrics':
			return insights.filter((item) => item.kind === 'improving_trend')
		case 'declining_metrics':
			return insights.filter((item) => item.kind === 'persistent_trend')
		case 'abnormal_reports':
			return insights.filter(
				(item) => item.kind === 'new_abnormality' || item.kind === 'summary',
			)
		case 'health_journey':
		case 'summarize_report':
			return insights.filter(
				(item) => item.kind === 'summary' || item.kind === 'improving_trend',
			)
		case 'resolved_findings':
			return insights.filter((item) => item.kind === 'resolved_abnormality')
		default:
			return insights
	}
}
