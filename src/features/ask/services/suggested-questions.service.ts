import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'

export function buildSuggestedQuestions(userId: string): string[] {
	const graph = healthKnowledgeService.getGraphForUser(userId)
	const suggestions = new Set<string>()

	suggestions.add('How is my liver?')
	suggestions.add('Show all abnormal blood tests.')
	suggestions.add('Which metrics are improving?')
	suggestions.add('Compare my last two reports.')

	const vitaminHistory = graph.profile.metricHistories.find(
		(history) => history.canonicalMetricId === 'vitamin-d',
	)

	if (vitaminHistory) {
		suggestions.add('When was my Vitamin D lowest?')
		suggestions.add('Explain my Vitamin D trend.')
	}

	const hba1cHistory = graph.profile.metricHistories.find(
		(history) => history.canonicalMetricId === 'hba1c',
	)

	if (hba1cHistory) {
		suggestions.add('Explain my HbA1c trend.')
	}

	if (graph.profile.alerts.length > 0) {
		suggestions.add('What should I discuss with my doctor?')
	}

	suggestions.add('Summarize my latest report.')

	return [...suggestions].slice(0, 6)
}
