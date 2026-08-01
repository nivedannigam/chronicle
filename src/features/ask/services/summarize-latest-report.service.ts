import {
	createDefaultAIPlatformPipeline,
	type AIPlatformPipeline,
} from '@/shared/ai/pipeline/ai-platform.pipeline'
import { isAIPlatformConfigured } from '@/shared/ai/config/ai-platform.config'
import { isProductionAiQuestion } from '@/shared/ai/errors/ai-errors'
import {
	formatPlatformErrorForUser,
	platformResponseToAskTurn,
} from '@/features/ask/services/platform-response.adapter'
import type { BetaExperienceId } from '@/features/ask/beta/beta-experiences'

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
	pipeline?: AIPlatformPipeline
	onStream?: (partial: string) => void
	betaExperienceId?: BetaExperienceId
}) {
	const pipeline = input.pipeline ?? createDefaultAIPlatformPipeline()

	if (input.onStream) {
		input.onStream('Selecting relevant health evidence…')
	}

	const result = await pipeline.runHealthQuestion({
		userId: input.userId,
		question: input.question,
		familyMemberId: input.familyMemberId,
		accountOwnerMemberId: input.accountOwnerMemberId,
		memberName: input.memberName,
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
