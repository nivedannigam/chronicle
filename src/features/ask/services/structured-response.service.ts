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

	if (turn.clinicalAnswer?.recommendations.length) {
		recommendations.push(...turn.clinicalAnswer.recommendations)
	}

	for (const card of turn.cards) {
		if (card.type === 'alert') {
			recommendations.push(card.message)
		}

		if (card.type === 'action') {
			recommendations.push(`${card.title} — ${card.dueLabel}`)
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

	return [...new Set(recommendations)].slice(0, 4)
}

function buildLimitations(turn: AskConversationTurn): string[] {
	const limitations: string[] = []

	if (turn.clinicalAnswer?.limitations.length) {
		limitations.push(...turn.clinicalAnswer.limitations)
	}

	return [...new Set(limitations)].slice(0, 2)
}

function buildUncertaintyNote(turn: AskConversationTurn): string | null {
	const limitations = buildLimitations(turn)

	if (limitations.length > 0) {
		return limitations[0]!
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
	const clinical = turn.clinicalAnswer
	const platform = turn.platformResponse
	const paragraphs = splitAnswerParagraphs(turn.answer)
	const directAnswer =
		platform?.directAnswer ??
		clinical?.executiveSummary ??
		paragraphs[0] ??
		stripSafetyFooter(turn.answer)
	const keyFindings =
		platform?.evidenceFromReports ?? clinical?.keyFindings ?? []
	const explanation =
		!clinical && !platform && paragraphs.length > 1
			? paragraphs.slice(1).join('\n\n')
			: null

	const relatedQuestions = Array.from(
		new Set([
			...turn.followUpQuestions,
			...(turn.trust?.followUpQuestions ?? []),
		]),
	).slice(0, 5)

	const limitations = buildLimitations(turn)

	return {
		directAnswer,
		evidenceFromReports: platform?.evidenceFromReports ?? keyFindings,
		whatChanged: platform?.whatChanged,
		whatItMayMean: platform?.whatItMayMean,
		doctorDiscussion: platform?.doctorDiscussion,
		sourceReports: (
			platform?.sourceReports ?? platform?.evidenceReferences
		)?.map((ref) => ({
			id: ref.id,
			label: ref.label,
		})),
		keyFindings,
		explanation,
		recommendations: buildRecommendations(turn),
		limitations,
		hasEvidence: Boolean(
			turn.trust?.evidenceItems.length ||
			turn.citations.length ||
			turn.evidence.length ||
			(platform?.sourceReports?.length ?? 0) > 0,
		),
		relatedQuestions,
		confidenceLevel:
			platform?.confidenceLevel ??
			turn.trust?.confidence.level ??
			turn.confidenceLevel,
		uncertaintyNote: buildUncertaintyNote(turn),
		showSafetyFooter: SAFETY_PATTERN.test(turn.answer),
	}
}
