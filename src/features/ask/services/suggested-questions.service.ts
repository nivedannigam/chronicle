import type { AskQuestionGroup } from '@/constants/product-copy'
import { ASK_QUESTION_GROUPS } from '@/constants/product-copy'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'

function appendHealthQuestions(
	groups: AskQuestionGroup[],
	userId: string,
): AskQuestionGroup[] {
	const graph = healthKnowledgeService.getGraphForUser(userId)
	const healthGroup = groups.find((group) => group.id === 'health')

	if (!healthGroup) {
		return groups
	}

	const extra: string[] = []
	const vitaminHistory = graph.profile.metricHistories.find(
		(history) => history.canonicalMetricId === 'vitamin-d',
	)

	if (vitaminHistory) {
		extra.push('Explain my Vitamin D trend.')
	}

	const hba1cHistory = graph.profile.metricHistories.find(
		(history) => history.canonicalMetricId === 'hba1c',
	)

	if (hba1cHistory) {
		extra.push('Explain my HbA1c trend.')
	}

	if (graph.profile.alerts.length > 0) {
		extra.push('What should I discuss with my doctor?')
	}

	if (extra.length === 0) {
		return groups
	}

	return groups.map((group) =>
		group.id === 'health'
			? {
					...group,
					questions: [...new Set([...group.questions, ...extra])],
				}
			: group,
	)
}

export function buildSuggestedQuestionGroups(
	userId: string,
): AskQuestionGroup[] {
	return appendHealthQuestions(
		ASK_QUESTION_GROUPS.map((group) => ({
			...group,
			questions: [...group.questions],
		})),
		userId,
	)
}

/** @deprecated Use buildSuggestedQuestionGroups */
export function buildSuggestedQuestions(userId: string): string[] {
	return buildSuggestedQuestionGroups(userId)
		.flatMap((group) => group.questions)
		.slice(0, 8)
}
