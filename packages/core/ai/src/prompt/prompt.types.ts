import type { AiMessage } from '../types/ai.types.ts'

export interface BuiltPrompt {
	system: string
	user: string
	messages: AiMessage[]
	contextJson: string
}

export interface PromptConversationTurn {
	question: string
	answer: string
}

export interface PromptBuildInput {
	question: string
	contextJson: string
	dataAvailable: boolean
	memberName: string | null
	conversationHistory: PromptConversationTurn[]
	personalizationInstructions?: string
	activeDomains?: string[]
	intent?: string
}
