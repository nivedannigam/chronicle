import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type {
	AskIntent,
	KnowledgeDomain,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'

export function generateFollowUpQuestions(input: {
	intent: AskIntent
	knowledge: RetrievedKnowledge
	memberName?: string | null
	question: string
	domains?: KnowledgeDomain[]
}): string[] {
	const suggestions = new Set<string>()
	const prefix = input.memberName ? `${input.memberName}'s ` : 'My '
	const domains = input.domains ?? [input.knowledge.domain]

	if (input.knowledge.metrics.length > 0) {
		const metric = input.knowledge.metrics[0]!
		suggestions.add(`Explain ${metric.displayName}.`)
		suggestions.add(`Compare ${metric.displayName} with last year.`)
		suggestions.add('Show related reports.')
	}

	if (
		input.intent === 'compare_reports' ||
		input.knowledge.reports.length >= 2
	) {
		suggestions.add('Compare with the previous report.')
	}

	if (
		input.intent === 'metric_trend' ||
		input.intent === 'metric_history' ||
		/trend|change|improv/i.test(input.question)
	) {
		suggestions.add('Has this improved over time?')
	}

	if (
		input.knowledge.alerts.length > 0 ||
		input.intent === 'doctor_discussion'
	) {
		suggestions.add('What should I discuss with my doctor?')
	}

	if (input.knowledge.reports.length > 0) {
		suggestions.add(`Summarize ${prefix}latest report.`)
	}

	if (input.knowledge.metrics.some((metric) => metric.status !== 'normal')) {
		suggestions.add('Which results need attention?')
	}

	if (input.intent === 'attention_summary') {
		suggestions.add('What changed since my last report?')
		suggestions.add('What should I discuss with my doctor?')
	}

	if (
		input.intent === 'summarize_health' ||
		input.intent === 'health_journey'
	) {
		suggestions.add("What's improving?")
	}

	if (domains.includes('documents')) {
		suggestions.add('Show related documents.')
	}

	if (domains.includes('finance')) {
		suggestions.add('Show related financial records.')
	}

	if (suggestions.size === 0) {
		suggestions.add('What does Chronicle know about this?')
		suggestions.add('Show related records.')
	}

	return [...suggestions].slice(0, 5)
}
