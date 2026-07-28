import type { AskConversationTurn } from '@/features/ask/types'
import type { StructuredAskResponse } from '@/features/ask/types/structured-response.types'
import { TRUST_SAFETY_FOOTER } from '@/features/ask/trust/trust.types'

const SAFETY_PATTERN = /this is informational and not medical advice/i

function stripSafetyFooter(text: string): string {
	return text
		.replace(SAFETY_PATTERN, '')
		.replace(TRUST_SAFETY_FOOTER, '')
		.trim()
}

function splitAnswerParagraphs(answer: string): string[] {
	return stripSafetyFooter(answer)
		.split(/\n\n+/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
}

function buildRecommendations(turn: AskConversationTurn): string[] {
	const recommendations: string[] = []

	for (const card of turn.cards) {
		if (card.type === 'alert') {
			recommendations.push(card.message)
		}

		if (card.type === 'action') {
			recommendations.push(`${card.title} — ${card.dueLabel}`)
		}
	}

	if (turn.trust?.missingInformation.length) {
		for (const line of turn.trust.missingInformation.slice(0, 2)) {
			recommendations.push(line)
		}
	}

	if (!turn.dataAvailable && recommendations.length === 0) {
		recommendations.push(
			'Import or upload relevant health reports or documents to improve coverage.',
		)
		recommendations.push(
			'Try rephrasing with a family member name or document type.',
		)
	}

	return recommendations.slice(0, 4)
}

function buildUncertaintyNote(turn: AskConversationTurn): string | null {
	if (turn.confidenceLevel === 'high' && turn.dataAvailable) {
		return null
	}

	if (turn.trust?.missingInformation[0]) {
		return turn.trust.missingInformation[0]!
	}

	if (!turn.dataAvailable) {
		return "I couldn't find enough information in your Chronicle records to answer confidently."
	}

	if (turn.confidenceLevel === 'low') {
		return 'Some details may be incomplete — verify important information before acting on it.'
	}

	return null
}

export function buildStructuredResponse(
	turn: AskConversationTurn,
): StructuredAskResponse {
	const paragraphs = splitAnswerParagraphs(turn.answer)
	const directAnswer = paragraphs[0] ?? stripSafetyFooter(turn.answer)
	const explanation =
		paragraphs.length > 1 ? paragraphs.slice(1).join('\n\n') : null

	const relatedQuestions = Array.from(
		new Set([
			...turn.followUpQuestions,
			...(turn.trust?.followUpQuestions ?? []),
		]),
	).slice(0, 5)

	return {
		directAnswer,
		explanation,
		recommendations: buildRecommendations(turn),
		hasEvidence: Boolean(
			turn.trust?.evidenceItems.length ||
			turn.citations.length ||
			turn.evidence.length,
		),
		relatedQuestions,
		confidenceLevel: turn.trust?.confidence.level ?? turn.confidenceLevel,
		uncertaintyNote: buildUncertaintyNote(turn),
		showSafetyFooter: SAFETY_PATTERN.test(turn.answer),
	}
}
