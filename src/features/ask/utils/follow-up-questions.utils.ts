import type { StructuredAskResponse } from '@/features/ask/types/structured-response.types'

const TRUST_DEBUG_PATTERN =
	/why did you say|what evidence supports|which reports contributed|what information is missing/i

/** Text corpus used to decide whether a follow-up topic was actually discussed. */
export function buildAnswerContext(structured: StructuredAskResponse): string {
	const parts = [
		structured.directAnswer,
		...(structured.evidenceFromReports ?? []),
		...structured.keyFindings,
		...(structured.whatChanged ?? []),
		...(structured.whatItMayMean ?? []),
		...structured.recommendations,
		...(structured.doctorDiscussion ?? []),
		...structured.limitations,
	]

	return parts.join(' ').toLowerCase()
}

function extractExplainTopic(question: string): string | null {
	const match = question.match(/^explain\s+(?:my\s+)?(.+?)[.?!]*$/i)
	if (!match) {
		return null
	}

	return match[1]!.trim().toLowerCase()
}

function isTopicDiscussed(topic: string, answerContext: string): boolean {
	if (answerContext.includes(topic)) {
		return true
	}

	const primary = topic.split(/\s+/)[0]
	if (primary && primary.length >= 3 && answerContext.includes(primary)) {
		return true
	}

	return false
}

/** Drop debug prompts and generic "Explain X" unless X appeared in the answer. */
export function filterFollowUpQuestions(
	questions: string[],
	answerContext: string,
): string[] {
	const context = answerContext.toLowerCase()
	const seen = new Set<string>()

	return questions.filter((question) => {
		const normalized = question.trim()
		if (!normalized || seen.has(normalized.toLowerCase())) {
			return false
		}

		if (TRUST_DEBUG_PATTERN.test(normalized)) {
			return false
		}

		const explainTopic = extractExplainTopic(normalized)
		if (explainTopic && !isTopicDiscussed(explainTopic, context)) {
			return false
		}

		seen.add(normalized.toLowerCase())
		return true
	})
}
