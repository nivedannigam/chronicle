import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import type { ChronicleInsight } from '@/features/health-insights/types/health-insights.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

function spanYears(observations: { observedAt: string }[]): number {
	if (observations.length < 2) {
		return 0
	}

	const first = new Date(observations[0]!.observedAt).getFullYear()
	const last = new Date(
		observations[observations.length - 1]!.observedAt,
	).getFullYear()

	return Math.max(1, last - first + 1)
}

function formatPercent(value: number | null): string {
	if (value == null) {
		return ''
	}

	const percent = Math.round(Math.abs(value) * 100)
	return `${percent}%`
}

function yearPhrase(years: number): string {
	if (years >= 3) {
		return 'the last three years'
	}

	if (years === 2) {
		return 'the last two years'
	}

	return 'recent reports'
}

export function generateLongTermTrendInsights(
	histories: HealthMetricHistory[],
): ChronicleInsight[] {
	const insights: ChronicleInsight[] = []

	for (const history of histories) {
		const { trend, observations, displayName, canonicalMetricId } = history

		if (observations.length < 2) {
			continue
		}

		const years = spanYears(observations)
		const latest = observations[observations.length - 1]!
		const previous = observations[observations.length - 2]!

		if (trend.direction === 'improving' && observations.length >= 2) {
			insights.push({
				id: `longterm-improving-${canonicalMetricId}`,
				domain: 'health',
				category: 'long_term_trends',
				title: `${displayName} trending better`,
				summary:
					years >= 2
						? `${displayName} has steadily improved over ${yearPhrase(years)}.`
						: `${displayName} is improving compared with your earlier reports.`,
				why: `Chronicle tracked ${observations.length} readings from ${observations[0]!.observedAt.slice(0, 4)} to ${latest.observedAt.slice(0, 4)}.`,
				evidence: [
					{
						reportId: latest.reportId,
						reportTitle: latest.reportTitle,
						metricName: displayName,
						date: latest.observedAt,
						snippet: `${previous.value} → ${latest.value}`,
					},
				],
				confidence: observations.length >= 3 ? 'high' : 'medium',
				severity: 'positive',
				timelineRefs: historyYears(observations),
				metricId: canonicalMetricId,
				beganAt: observations[0]!.observedAt,
			})
		}

		if (
			(trend.direction === 'declining' || trend.direction === 'rapid_change') &&
			trend.changePercent != null
		) {
			const pct = formatPercent(trend.changePercent)

			insights.push({
				id: `longterm-declining-${canonicalMetricId}`,
				domain: 'health',
				category: 'long_term_trends',
				title: `${displayName} changed over time`,
				summary: pct
					? `${displayName} ${trend.direction === 'rapid_change' ? 'changed significantly' : 'increased'} by ${pct} since your earliest recorded value.`
					: `${displayName} has moved unfavorably across your report history.`,
				why: 'Longitudinal comparison across all imported reports for this metric.',
				evidence: [
					{
						reportId: latest.reportId,
						reportTitle: latest.reportTitle,
						metricName: displayName,
						date: latest.observedAt,
						snippet: latest.value,
					},
				],
				confidence: observations.length >= 3 ? 'high' : 'medium',
				severity: 'attention',
				timelineRefs: historyYears(observations),
				metricId: canonicalMetricId,
				beganAt: observations[0]!.observedAt,
			})
		}

		if (
			trend.direction === 'stable' &&
			observations.length >= 2 &&
			['creatinine', 'egfr', 'alt', 'ast', 'ggt'].includes(canonicalMetricId)
		) {
			const categoryLabel = categoryLabelForMetric(
				canonicalMetricId,
				displayName,
			)

			insights.push({
				id: `longterm-stable-${canonicalMetricId}`,
				domain: 'health',
				category: 'long_term_trends',
				title: `${displayName} stable`,
				summary: `${categoryLabel} has remained stable across ${observations.length} readings.`,
				why: `Latest value ${latest.value} is consistent with earlier reports.`,
				evidence: [
					{
						reportId: latest.reportId,
						reportTitle: latest.reportTitle,
						metricName: displayName,
						date: latest.observedAt,
						snippet: latest.value,
					},
				],
				confidence: 'medium',
				severity: 'info',
				timelineRefs: historyYears(observations),
				metricId: canonicalMetricId,
				beganAt: observations[0]!.observedAt,
			})
		}

		if (
			ABNORMAL.has(latest.status) &&
			!ABNORMAL.has(previous.status) &&
			previous.reportId !== latest.reportId
		) {
			insights.push({
				id: `longterm-new-${canonicalMetricId}`,
				domain: 'health',
				category: 'recently_changed',
				title: `New finding: ${displayName}`,
				summary: `${displayName} is now flagged as ${latest.status} — it was within range in your previous report.`,
				why: 'Comparison between your two most recent reports.',
				evidence: [
					{
						reportId: latest.reportId,
						reportTitle: latest.reportTitle,
						metricName: displayName,
						date: latest.observedAt,
						snippet: `${previous.value} → ${latest.value}`,
					},
				],
				confidence: 'high',
				severity: 'attention',
				timelineRefs: [latest.observedAt.slice(0, 4)],
				metricId: canonicalMetricId,
				beganAt: latest.observedAt,
			})
		}
	}

	return insights.slice(0, 12)
}

function historyYears(observations: { observedAt: string }[]): string[] {
	return [
		...new Set(observations.map((obs) => obs.observedAt.slice(0, 4))),
	].sort()
}

function categoryLabelForMetric(
	canonicalMetricId: string,
	displayName: string,
): string {
	if (['creatinine', 'egfr', 'urea'].includes(canonicalMetricId)) {
		return 'Kidney function'
	}

	if (['alt', 'ast', 'ggt', 'bilirubin'].includes(canonicalMetricId)) {
		return 'Liver function'
	}

	if (
		['ldl', 'hdl', 'total-cholesterol', 'triglycerides'].includes(
			canonicalMetricId,
		)
	) {
		return 'Cholesterol profile'
	}

	return displayName
}
