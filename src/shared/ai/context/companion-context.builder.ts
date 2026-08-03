import type { ConversationMemoryContext } from '@/shared/ai/types/companion-response.types'

export interface ConversationTurnSnapshot {
	question: string
	answer: string
	intent?: string
	metricName?: string
	categoryId?: string
}

function extractTopicLabel(turn: ConversationTurnSnapshot): string | null {
	if (turn.metricName?.trim()) {
		return turn.metricName.trim()
	}

	const metricMatch = turn.question.match(
		/\b(vitamin d|cholesterol|ldl|hdl|hba1c|tsh|thyroid|liver|alt|ast)\b/i,
	)

	if (metricMatch?.[1]) {
		return metricMatch[1]
	}

	if (turn.categoryId?.trim()) {
		return turn.categoryId.replace(/_/g, ' ')
	}

	return null
}

function buildContinuityHint(
	turn: ConversationTurnSnapshot,
	indexFromEnd: number,
): string | null {
	const topic = extractTopicLabel(turn)

	if (!topic) {
		return null
	}

	if (indexFromEnd === 1) {
		return `Earlier in this conversation you asked about ${topic}.`
	}

	if (indexFromEnd === 2) {
		return `Previously we discussed ${topic}.`
	}

	return null
}

/**
 * Builds personal memory context for the prompt — never sent to users directly.
 */
export function buildConversationMemoryContext(
	turns: ConversationTurnSnapshot[],
): ConversationMemoryContext {
	const recent = turns.slice(-6)
	const previousQuestions = recent.map((turn) => turn.question)
	const previousTopics = recent
		.map(extractTopicLabel)
		.filter((topic): topic is string => Boolean(topic))
	const continuityHints = recent
		.slice()
		.reverse()
		.map((turn, index) => buildContinuityHint(turn, index + 1))
		.filter((hint): hint is string => Boolean(hint))
		.slice(0, 3)

	const lastTurn = recent[recent.length - 1]

	return {
		previousQuestions,
		previousTopics: [...new Set(previousTopics)],
		continuityHints,
		lastMetricDiscussed: lastTurn?.metricName,
		lastIntent: lastTurn?.intent,
	}
}

export function formatMemoryContextForPrompt(
	context: ConversationMemoryContext,
): string {
	if (
		context.previousQuestions.length === 0 &&
		context.continuityHints.length === 0
	) {
		return ''
	}

	const lines = [
		'ConversationMemory (use for continuity only — do not invent facts):',
	]

	if (context.continuityHints.length > 0) {
		lines.push(
			'Continuity:',
			...context.continuityHints.map((hint) => `- ${hint}`),
		)
	}

	if (context.previousQuestions.length > 0) {
		lines.push(
			'Recent questions:',
			...context.previousQuestions.slice(-4).map((question) => `- ${question}`),
		)
	}

	return lines.join('\n')
}
