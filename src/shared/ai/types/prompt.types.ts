import type { NormalizedKnowledge } from '@/shared/ai/types/knowledge.types'
import type { IntentId } from '@/shared/ai/types/ai-platform.types'
import type { AIMessage } from '@/shared/ai/types/ai-platform.types'

export interface PromptContext {
	intent: IntentId
	question: string
	knowledge: NormalizedKnowledge
	memberName?: string | null
	additionalInstructions?: string[]
}

export interface BuiltPrompt {
	system: string
	developer: string
	user: string
	evidence: string
	context: string
	outputSchema: string
	messages: AIMessage[]
}
