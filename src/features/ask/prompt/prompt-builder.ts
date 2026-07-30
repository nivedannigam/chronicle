import type { ConversationTurnMemory } from '@/features/ask/memory/conversation-memory'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'
import type { PersonalContext } from '@/features/personalization/types/personal-context.types'
import { stylePromptInstructions } from '@/features/personalization/services/response-adapter.service'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import {
	promptBuilder as corePromptBuilder,
	type BuiltPrompt,
} from '@chronicle/core-ai'

export type { BuiltPrompt }

export class PromptBuilder {
	build(input: {
		question: string
		knowledge: RetrievedKnowledge | null
		contextJson?: string
		memory: ConversationTurnMemory[]
		member: IntelligenceMemberContext
		dataAvailable: boolean
		personalContext?: PersonalContext
		activeDomains?: string[]
		intent?: string
	}): BuiltPrompt {
		const preferences = input.personalContext?.preferences
		const styleInstruction = preferences
			? stylePromptInstructions(preferences.communicationStyle)
			: stylePromptInstructions('detailed')

		const contextJson =
			input.contextJson ??
			JSON.stringify(
				{
					selectedMember: input.member.memberName,
					domain: input.knowledge?.domain,
					intent: input.knowledge?.intent,
					dataAvailable: input.dataAvailable,
					preferences: preferences
						? {
								language: preferences.language,
								units: preferences.units,
								communicationStyle: preferences.communicationStyle,
							}
						: undefined,
					reports: input.knowledge?.reports ?? [],
					metrics: input.knowledge?.metrics ?? [],
					timelines: input.knowledge?.timelines ?? [],
					trends: input.knowledge?.trends ?? [],
					observations: input.knowledge?.observations.slice(0, 40) ?? [],
					relationships: input.knowledge?.relationships ?? [],
					insights: input.knowledge?.insights ?? [],
					alerts: input.knowledge?.alerts ?? [],
					summaryLines: input.knowledge?.summaryLines ?? [],
				},
				null,
				2,
			)

		return corePromptBuilder.build({
			question: input.question,
			contextJson,
			dataAvailable: input.dataAvailable,
			memberName: input.member.memberName,
			conversationHistory: input.memory.map((turn) => ({
				question: turn.question,
				answer: turn.answer,
			})),
			personalizationInstructions: styleInstruction,
			activeDomains:
				input.activeDomains ??
				(input.knowledge?.domain ? [input.knowledge.domain] : []),
			intent: input.intent ?? input.knowledge?.intent,
		})
	}
}

export const promptBuilder = new PromptBuilder()
