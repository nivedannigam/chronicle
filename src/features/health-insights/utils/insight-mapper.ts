import type { HealthInsight } from '@/features/health/types'
import type { ChronicleInsight } from '@/features/health-insights/types/health-insights.types'

export function chronicleInsightToHealthInsight(
	insight: ChronicleInsight,
): HealthInsight {
	return {
		id: insight.id,
		title: insight.title,
		text: insight.summary,
		tone:
			insight.severity === 'positive'
				? 'positive'
				: insight.severity === 'attention'
					? 'warning'
					: 'neutral',
		category: insight.category,
		confidence: insight.confidence,
	}
}

export function chronicleInsightsToHealthInsights(
	insights: ChronicleInsight[],
): HealthInsight[] {
	return insights.map(chronicleInsightToHealthInsight)
}

export function formatInsightExplanation(insight: ChronicleInsight): string {
	const evidenceLines = insight.evidence
		.map((item) => {
			const parts = [
				item.reportTitle ?? item.reportId,
				item.metricName,
				item.date,
			]
				.filter(Boolean)
				.join(' · ')

			return parts
		})
		.filter(Boolean)

	return [
		insight.summary,
		`Why: ${insight.why}`,
		evidenceLines.length > 0 ? `Evidence: ${evidenceLines.join('; ')}` : null,
		insight.beganAt ? `First noted: ${insight.beganAt.slice(0, 10)}` : null,
	]
		.filter(Boolean)
		.join(' ')
}
