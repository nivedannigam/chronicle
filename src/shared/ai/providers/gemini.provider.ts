import { estimateTokenCost } from '@/shared/ai/cost/cost-pricing'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'
import {
	AskAiEdgeConfigurationError,
	AskAiEdgeInvokeError,
	invokeAskAiEdgeFunction,
} from '@/shared/ai/transport/ask-ai-edge.client'
import type {
	AIGenerateRequest,
	AIGenerateResponse,
	AIProvider,
} from '@/shared/ai/types/ai-platform.types'

export class GeminiProviderError extends Error {
	readonly code:
		| 'not_configured'
		| 'timeout'
		| 'quota_exceeded'
		| 'rate_limit'
		| 'invalid_json'
		| 'network'
		| 'api_error'
	readonly statusCode?: number

	constructor(
		message: string,
		code:
			| 'not_configured'
			| 'timeout'
			| 'quota_exceeded'
			| 'rate_limit'
			| 'invalid_json'
			| 'network'
			| 'api_error',
		statusCode?: number,
	) {
		super(message)
		this.name = 'GeminiProviderError'
		this.code = code
		this.statusCode = statusCode
	}
}

function classifyGeminiError(error: unknown): GeminiProviderError {
	if (error instanceof AskAiEdgeConfigurationError) {
		return new GeminiProviderError(error.message, 'not_configured')
	}

	if (error instanceof AskAiEdgeInvokeError) {
		const status = error.statusCode ?? 502
		const lower =
			`${error.message} ${error.providerResponse ?? ''}`.toLowerCase()

		if (status === 429 || lower.includes('rate limit')) {
			return new GeminiProviderError(
				'Gemini rate limit reached. Please try again shortly.',
				'rate_limit',
				status,
			)
		}

		if (
			status === 403 ||
			lower.includes('quota') ||
			lower.includes('billing')
		) {
			return new GeminiProviderError(
				'Gemini quota exceeded. Please try again later.',
				'quota_exceeded',
				status,
			)
		}

		if (status === 408 || lower.includes('timeout')) {
			return new GeminiProviderError(
				'Gemini request timed out.',
				'timeout',
				status,
			)
		}

		return new GeminiProviderError(error.message, 'api_error', status)
	}

	if (error instanceof DOMException && error.name === 'AbortError') {
		return new GeminiProviderError('Gemini request was cancelled.', 'timeout')
	}

	return new GeminiProviderError(
		error instanceof Error ? error.message : 'Gemini request failed.',
		'network',
	)
}

export class GeminiProvider implements AIProvider {
	readonly id = 'gemini' as const

	async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
		const config = loadAIPlatformConfig()
		const model = GEMINI_MODEL
		const startedAt = Date.now()

		try {
			const payload = await invokeAskAiEdgeFunction({
				provider: 'gemini',
				model,
				messages: request.messages,
				responseFormat: request.responseFormat ?? 'json',
				temperature: request.temperature ?? config.temperature,
				maxTokens: request.maxTokens ?? config.maxTokens,
			})

			const promptTokens = payload.usage.promptTokens
			const completionTokens = payload.usage.completionTokens

			return {
				requestId: request.requestId,
				content: payload.content,
				provider: 'gemini',
				model: payload.model ?? model,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: payload.usage.totalTokens,
				},
				latencyMs: payload.latencyMs || Math.max(1, Date.now() - startedAt),
				estimatedCostUsd: estimateTokenCost({
					provider: 'gemini',
					model: payload.model ?? model,
					promptTokens,
					completionTokens,
				}),
			}
		} catch (error) {
			throw classifyGeminiError(error)
		}
	}
}
