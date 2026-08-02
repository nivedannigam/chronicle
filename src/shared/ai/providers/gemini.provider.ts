import { estimateTokenCost } from '@/shared/ai/cost/cost-pricing'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'
import { classifyGeminiFailure } from '@/shared/ai/errors/ai-errors'
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
		| 'auth_required'
		| 'billing_depleted'
		| 'model_not_found'
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
			| 'auth_required'
			| 'billing_depleted'
			| 'model_not_found'
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
		const classified = classifyGeminiFailure({
			statusCode: status,
			message: error.message,
			providerResponse: error.providerResponse,
		})

		const codeByKind = {
			auth: 'auth_required',
			billing: 'billing_depleted',
			rate_limit: 'rate_limit',
			model_not_found: 'model_not_found',
			timeout: 'timeout',
			validation: 'invalid_json',
			generic: 'api_error',
		} as const

		return new GeminiProviderError(
			classified.userMessage,
			codeByKind[classified.kind],
			classified.statusCode ?? status,
		)
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
