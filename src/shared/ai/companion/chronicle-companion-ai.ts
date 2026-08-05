import {
	buildConversationMemoryContext,
	formatMemoryContextForPrompt,
	type ConversationTurnSnapshot,
} from '@/shared/ai/context/companion-context.builder'
import {
	createDefaultAIPlatformPipeline,
	type AIPlatformPipeline,
} from '@/shared/ai/pipeline/ai-platform.pipeline'
import type { AIPlatformResult } from '@/shared/ai/types/pipeline.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export interface ChronicleCompanionAskInput {
	userId: string
	question: string
	domain?: KnowledgeDomainId
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
	memberName?: string | null
	categoryId?: string
	reportId?: string
	reportIds?: string[]
	conversationTurns?: ConversationTurnSnapshot[]
	pipeline?: AIPlatformPipeline
}

export interface ChronicleCompanionAskResult extends AIPlatformResult {
	memoryContext: ReturnType<typeof buildConversationMemoryContext>
}

/**
 * Unified entry point for Chronicle's Personal AI Companion.
 * Every domain module (Health first) should call this — never Gemini directly.
 */
export class ChronicleCompanionAI {
	private readonly pipeline: AIPlatformPipeline

	constructor(pipeline: AIPlatformPipeline) {
		this.pipeline = pipeline
	}

	async ask(
		input: ChronicleCompanionAskInput,
	): Promise<ChronicleCompanionAskResult> {
		const domain = input.domain ?? 'health'
		const memoryContext = buildConversationMemoryContext(
			input.conversationTurns ?? [],
		)

		if (domain !== 'health') {
			throw new Error(
				`Domain "${domain}" is not yet supported by Chronicle Companion AI.`,
			)
		}

		const result = await this.pipeline.runHealthQuestion({
			userId: input.userId,
			question: input.question,
			familyMemberId: input.familyMemberId,
			accountOwnerMemberId: input.accountOwnerMemberId,
			memberName: input.memberName,
			categoryId: input.categoryId,
			reportId: input.reportId,
			reportIds: input.reportIds,
			conversationTurns: input.conversationTurns,
			memoryContextPrompt: formatMemoryContextForPrompt(memoryContext),
		})

		return {
			...result,
			memoryContext,
		}
	}
}

export function createChronicleCompanionAI(
	pipeline?: AIPlatformPipeline,
): ChronicleCompanionAI {
	return new ChronicleCompanionAI(pipeline ?? createDefaultAIPlatformPipeline())
}

export const defaultChronicleCompanionAI = createChronicleCompanionAI()
