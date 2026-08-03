import {
	createChronicleCompanionAI,
	type ChronicleCompanionAI,
} from '@/shared/ai/companion/chronicle-companion-ai'
import { isAIPlatformConfigured } from '@/shared/ai/config/ai-platform.config'
import { isProductionAiQuestion } from '@/shared/ai/errors/ai-errors'
import {
	formatPlatformErrorForUser,
	platformResponseToAskTurn,
} from '@/features/ask/services/platform-response.adapter'
import type { BetaExperienceId } from '@/features/ask/beta/beta-experiences'
import type { ConversationTurnSnapshot } from '@/shared/ai/context/companion-context.builder'

export function isSummarizeReportAiEnabled(): boolean {
	return isAIPlatformConfigured()
}

export function shouldUseProductionAi(input: {
	question: string
	legacyIntent?: string
}): boolean {
	return isProductionAiQuestion(input) && isSummarizeReportAiEnabled()
}

export async function runProductionHealthAi(input: {
	userId: string
	question: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
	memberName?: string | null
	conversationTurns?: ConversationTurnSnapshot[]
	companion?: ChronicleCompanionAI
	onStream?: (partial: string) => void
	betaExperienceId?: BetaExperienceId
}) {
	const companion = input.companion ?? createChronicleCompanionAI()

	if (input.onStream) {
		input.onStream('Reviewing your health records…')
	}

	const result = await companion.ask({
		userId: input.userId,
		question: input.question,
		domain: 'health',
		familyMemberId: input.familyMemberId,
		accountOwnerMemberId: input.accountOwnerMemberId,
		memberName: input.memberName,
		conversationTurns: input.conversationTurns,
	})

	const turn = platformResponseToAskTurn({
		response: result.response,
		healthKnowledge: result.healthKnowledge,
		memberName: input.memberName,
		memberId: input.familyMemberId ?? null,
		dataAvailable: Boolean(result.healthKnowledge?.latestReport),
		question: input.question,
		betaExperienceId: input.betaExperienceId,
	})

	if (input.onStream) {
		input.onStream(turn.answer)
	}

	return {
		turn,
		result,
	}
}

/** @deprecated Use runProductionHealthAi */
export const runSummarizeLatestReportAi = runProductionHealthAi

export { formatPlatformErrorForUser }
