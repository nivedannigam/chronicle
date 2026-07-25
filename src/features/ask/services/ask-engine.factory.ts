import { askAiConfig, isAskAiProviderConfigured } from '@/config/ask-ai'
import '@/features/intelligence/providers/register-providers'
import { aiAskReasoningEngine } from '@/features/ask/services/ai-ask-reasoning.engine'
import type { AskReasoningEngine } from '@/features/ask/services/knowledge-query.interface'

export function createAskReasoningEngine(): AskReasoningEngine {
	return aiAskReasoningEngine
}

export const askReasoningEngine = createAskReasoningEngine()

export function getActiveAskImplementation(): 'grounded-only' | 'ai-provider' {
	return isAskAiProviderConfigured() ? 'ai-provider' : 'grounded-only'
}

export function getActiveAskProviderLabel(): string {
	return isAskAiProviderConfigured()
		? (askAiConfig.provider ?? 'ai')
		: 'grounded-only'
}
