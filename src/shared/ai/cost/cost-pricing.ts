import type { AIProviderId } from '@/shared/ai/types/ai-platform.types'

export interface ModelPricing {
	inputPer1M: number
	outputPer1M: number
}

/** USD per 1M tokens — update when provider pricing changes. */
const MODEL_PRICING: Record<string, ModelPricing> = {
	'gemini-2.0-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
	'gemini-2.0-flash-lite': { inputPer1M: 0.075, outputPer1M: 0.3 },
	'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.3 },
	'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.0 },
	'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
	'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
	'claude-3-5-sonnet-20241022': { inputPer1M: 3.0, outputPer1M: 15.0 },
	'mock-model': { inputPer1M: 0, outputPer1M: 0 },
}

const PROVIDER_FALLBACK: Record<AIProviderId, ModelPricing> = {
	gemini: { inputPer1M: 0.1, outputPer1M: 0.4 },
	openai: { inputPer1M: 0.15, outputPer1M: 0.6 },
	claude: { inputPer1M: 3.0, outputPer1M: 15.0 },
	mock: { inputPer1M: 0, outputPer1M: 0 },
}

export function estimateTokenCost(input: {
	provider: AIProviderId
	model: string
	promptTokens: number
	completionTokens: number
}): number {
	const pricing = MODEL_PRICING[input.model] ??
		PROVIDER_FALLBACK[input.provider] ?? {
			inputPer1M: 0,
			outputPer1M: 0,
		}

	const cost =
		(input.promptTokens / 1_000_000) * pricing.inputPer1M +
		(input.completionTokens / 1_000_000) * pricing.outputPer1M

	return Math.round(cost * 1_000_000) / 1_000_000
}
