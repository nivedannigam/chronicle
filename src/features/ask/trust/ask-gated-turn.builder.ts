import type { AskConversationTurn } from '@/features/ask/types'
import { toAskKnowledgeDomains } from '@/features/ask/utils/ask-domain.mapper'
import { toConfidenceLevel } from '@/features/intelligence/types/confidence.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import {
	ASK_NOT_FOUND_MESSAGE,
	type AskAnswerStatus,
} from '@/features/ask/trust/ask-answer-contract'
import { buildRestrictedAccessMessage } from '@/core/platform/services/privacy-authorization.service'

export function buildGatedAskTurn(input: {
	question: string
	status: AskAnswerStatus
	memberId: string | null
	memberName: string | null
	domains: KnowledgeDomainId[]
	restrictedMemberName?: string | null
}): AskConversationTurn {
	const timestamp = new Date().toISOString()

	let answer = ASK_NOT_FOUND_MESSAGE

	if (input.status === 'RESTRICTED') {
		answer = buildRestrictedAccessMessage(input.restrictedMemberName ?? null)
	}

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer,
		cards: [],
		relatedReports: [],
		relatedMetrics: [],
		citations: [],
		evidence: [],
		followUpQuestions: [],
		confidence: input.status === 'RESTRICTED' ? 0.95 : 0.2,
		confidenceLevel: toConfidenceLevel(
			input.status === 'RESTRICTED' ? 0.95 : 0.2,
		),
		dataAvailable: false,
		memberId: input.memberId,
		memberName: input.memberName,
		displayTimestamp: 'Now',
		timestamp,
		domains: toAskKnowledgeDomains(input.domains),
	}
}
