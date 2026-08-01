import { estimateTokenCost } from '@/shared/ai/cost/cost-pricing'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
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

function readProxyUrl(): string {
	const config = loadAIPlatformConfig()
	return config.proxyUrl ?? ''
}

function classifyGeminiError(
	status: number,
	body: string,
): GeminiProviderError {
	const lower = body.toLowerCase()

	if (status === 429 || lower.includes('rate limit')) {
		return new GeminiProviderError(
			'Gemini rate limit reached. Please try again shortly.',
			'rate_limit',
			status,
		)
	}

	if (status === 403 || lower.includes('quota') || lower.includes('billing')) {
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

	return new GeminiProviderError(
		`Gemini request failed (${status}).`,
		'api_error',
		status,
	)
}

interface ProxyResponse {
	content: string
	provider: 'gemini'
	model: string
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
	latencyMs: number
	error?: string
}

export class GeminiProvider implements AIProvider {
	readonly id = 'gemini' as const

	async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
		const proxyUrl = readProxyUrl()

		if (!proxyUrl) {
			throw new GeminiProviderError(
				'Gemini is not configured. Set VITE_AI_PROXY_URL to your ask-ai edge function.',
				'not_configured',
			)
		}

		const startedAt = Date.now()
		const model = request.model ?? loadAIPlatformConfig().model

		let response: Response

		try {
			response = await fetch(proxyUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: 'gemini',
					model,
					messages: request.messages,
					responseFormat: request.responseFormat ?? 'json',
					temperature: request.temperature,
					maxTokens: request.maxTokens,
				}),
				signal: request.signal,
			})
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new GeminiProviderError(
					'Gemini request was cancelled.',
					'timeout',
				)
			}

			throw new GeminiProviderError(
				'Unable to reach Gemini. Check your network connection.',
				'network',
			)
		}

		const latencyMs = Math.max(1, Date.now() - startedAt)

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			throw classifyGeminiError(response.status, body)
		}

		const payload = (await response.json()) as ProxyResponse

		if (payload.error) {
			throw new GeminiProviderError(payload.error, 'api_error')
		}

		const promptTokens = payload.usage?.promptTokens ?? 0
		const completionTokens = payload.usage?.completionTokens ?? 0

		return {
			requestId: request.requestId,
			content: payload.content,
			provider: 'gemini',
			model: payload.model ?? model,
			usage: {
				promptTokens,
				completionTokens,
				totalTokens:
					payload.usage?.totalTokens ?? promptTokens + completionTokens,
			},
			latencyMs: payload.latencyMs ?? latencyMs,
			estimatedCostUsd: estimateTokenCost({
				provider: 'gemini',
				model: payload.model ?? model,
				promptTokens,
				completionTokens,
			}),
		}
	}
}
