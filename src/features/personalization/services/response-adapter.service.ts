import type { CommunicationStyle } from '@/features/personalization/types/personal-context.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

const PLAIN_LANGUAGE: Record<string, string> = {
	LDL: 'bad cholesterol (LDL)',
	HDL: 'good cholesterol (HDL)',
	HbA1c: 'average blood sugar (HbA1c)',
	eGFR: 'kidney function (eGFR)',
	'ALT (SGPT)': 'liver enzyme (ALT)',
	'AST (SGOT)': 'liver enzyme (AST)',
	TSH: 'thyroid level (TSH)',
}

function stripSafetyFooter(answer: string): { body: string; footer: string } {
	const marker = 'This is informational and not medical advice'
	const index = answer.indexOf(marker)

	if (index < 0) {
		return { body: answer, footer: '' }
	}

	return {
		body: answer.slice(0, index).trim(),
		footer: answer.slice(index).trim(),
	}
}

function summarizeSentences(text: string, maxSentences: number): string {
	const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)

	return sentences.slice(0, maxSentences).join(' ')
}

function appendTrendContext(
	answer: string,
	knowledge: RetrievedKnowledge | null,
): string {
	if (!knowledge) {
		return answer
	}

	const extras: string[] = []

	for (const trend of knowledge.trends.slice(0, 2)) {
		extras.push(
			`${trend.displayName} is ${trend.direction} (${trend.changePercent} over ${trend.dataPointCount} readings).`,
		)
	}

	for (const timeline of knowledge.timelines.slice(0, 1)) {
		const first = timeline.observations[0]
		const last = timeline.observations[timeline.observations.length - 1]

		if (first && last && first.id !== last.id) {
			extras.push(
				`${timeline.displayName} moved from ${first.value} (${first.observedAt.slice(0, 10)}) to ${last.value} (${last.observedAt.slice(0, 10)}).`,
			)
		}
	}

	if (extras.length === 0) {
		return answer
	}

	return `${answer}\n\nTrend context: ${extras.join(' ')}`
}

function appendClinicalDetail(
	answer: string,
	knowledge: RetrievedKnowledge | null,
): string {
	if (!knowledge?.metrics.length) {
		return answer
	}

	const lines = knowledge.metrics.slice(0, 4).map((metric) => {
		const range = metric.referenceRange
			? ` (ref: ${metric.referenceRange})`
			: ''
		return `${metric.displayName}: ${metric.latestValue}${range} — ${metric.status}`
	})

	return `${answer}\n\nStructured findings: ${lines.join('; ')}.`
}

function simplifyLanguage(text: string): string {
	let result = text

	for (const [term, plain] of Object.entries(PLAIN_LANGUAGE)) {
		result = result.replace(new RegExp(`\\b${term}\\b`, 'g'), plain)
	}

	return result
}

export function adaptAnswerForStyle(input: {
	answer: string
	style: CommunicationStyle
	knowledge: RetrievedKnowledge | null
	memberName?: string | null
}): string {
	const { body, footer } = stripSafetyFooter(input.answer)
	let adapted = body

	switch (input.style) {
		case 'simple':
			adapted = simplifyLanguage(summarizeSentences(body, 3))
			break
		case 'clinical':
			adapted = appendClinicalDetail(body, input.knowledge)
			break
		case 'detailed':
		default:
			adapted = appendTrendContext(body, input.knowledge)
			break
	}

	if (input.memberName && input.style !== 'clinical') {
		adapted = adapted.replace(
			/\bIn your records\b/i,
			`In ${input.memberName}'s records`,
		)
	}

	return footer ? `${adapted}\n\n${footer}` : adapted
}

export function stylePromptInstructions(style: CommunicationStyle): string {
	switch (style) {
		case 'simple':
			return 'Use short sentences, minimal medical jargon, and a concise summary (2–4 sentences when possible).'
		case 'clinical':
			return 'Use precise medical terminology, include reference ranges when available, and structured clinical phrasing.'
		case 'detailed':
		default:
			return 'Provide a full explanation with trend context, supporting metrics, and evidence when available.'
	}
}

export function shouldIncludeAnswerCards(
	style: CommunicationStyle,
	displayFormat: 'summary' | 'detailed',
): boolean {
	if (displayFormat === 'summary') {
		return false
	}

	return style !== 'simple'
}
