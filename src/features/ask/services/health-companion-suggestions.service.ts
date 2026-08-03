import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'

export interface CompanionSuggestion {
	id: string
	label: string
	question: string
}

/**
 * Contextual health suggestions for Ask — derived from knowledge, not random prompts.
 */
export function buildHealthCompanionSuggestions(input: {
	healthKnowledge?: HealthKnowledge | null
	reportCount?: number
	recentQuestions?: string[]
}): CompanionSuggestion[] {
	const suggestions: CompanionSuggestion[] = []
	const seen = new Set<string>()
	const knowledge = input.healthKnowledge
	const reportCount =
		input.reportCount ??
		(knowledge?.previousReports.length ?? 0) + (knowledge?.latestReport ? 1 : 0)

	const add = (item: CompanionSuggestion) => {
		const key = item.question.trim().toLowerCase()

		if (seen.has(key)) {
			return
		}

		if (input.recentQuestions?.some((q) => q.trim().toLowerCase() === key)) {
			return
		}

		seen.add(key)
		suggestions.push(item)
	}

	if (reportCount === 0) {
		add({
			id: 'start-story',
			label: 'What can Chronicle tell me about my health?',
			question:
				'What can Chronicle tell me about my health after I import reports?',
		})
		return suggestions
	}

	if (knowledge?.latestReport) {
		add({
			id: 'explain-today',
			label: "Explain today's results",
			question: 'Explain my latest health report in simple English.',
		})
	}

	if (reportCount >= 2) {
		add({
			id: 'compare-last-year',
			label: 'Compare with last year',
			question: 'Compare my latest visit with my previous annual checkup.',
		})

		add({
			id: 'what-changed',
			label: 'What changed since my last visit?',
			question: 'What changed since my last visit?',
		})
	}

	if ((knowledge?.abnormalMetrics.length ?? 0) > 0) {
		add({
			id: 'anything-concerning',
			label: 'Anything concerning?',
			question: 'Is there anything concerning in my recent results?',
		})
	}

	const vitaminD = knowledge?.metrics.find((metric) =>
		/vitamin d|vit d|25-oh/i.test(metric.displayName),
	)

	if (vitaminD) {
		add({
			id: 'explain-vitamin-d',
			label: 'Explain Vitamin D',
			question: 'Explain my Vitamin D results and what they may mean.',
		})
	}

	add({
		id: 'doctor-questions',
		label: 'Questions for my doctor',
		question: 'What questions should I ask my doctor about my recent results?',
	})

	add({
		id: 'how-am-i-doing',
		label: 'How am I doing?',
		question: 'How am I doing overall based on my health reports?',
	})

	add({
		id: 'prepare-visit',
		label: 'Prepare for my visit',
		question: 'Help me prepare for my next doctor visit.',
	})

	return suggestions.slice(0, 6)
}
