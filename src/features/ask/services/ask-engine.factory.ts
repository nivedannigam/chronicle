import { askAiConfig, isAskAiProviderConfigured } from '@/config/ask-ai'
import '@/features/intelligence/providers/register-providers'
import { registerHealthPromptExtensions } from '@/features/health/prompt/health-prompt.bootstrap'
import { aiAskReasoningEngine } from '@/features/ask/services/ai-ask-reasoning.engine'
import type { AskReasoningEngine } from '@/features/ask/services/knowledge-query.interface'
import { registerAskAiInvoker } from '@chronicle/core-ai/transport/ask-ai-invoker'
import {
	invokeAskAiEdgeFunction,
	type AskAiEdgeInvokeBody,
} from '@/shared/ai/transport/ask-ai-edge.client'

registerHealthPromptExtensions()

registerAskAiInvoker(async (body) => {
	const result = await invokeAskAiEdgeFunction(
		body as unknown as AskAiEdgeInvokeBody,
	)
	return result as unknown as Record<string, unknown>
})

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
