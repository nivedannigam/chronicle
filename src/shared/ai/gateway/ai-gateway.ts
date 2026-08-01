import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { recordAIObservability } from '@/shared/ai/observability/ai-observability'
import { createAIProvider } from '@/shared/ai/providers/provider.factory'
import type {
	AIGenerateRequest,
	AIGenerateResponse,
	AIPlatformConfig,
} from '@/shared/ai/types/ai-platform.types'

function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<T> {
	if (signal?.aborted) {
		return Promise.reject(new DOMException('Aborted', 'AbortError'))
	}

	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`AI request timed out after ${timeoutMs}ms`))
		}, timeoutMs)

		const onAbort = () => {
			clearTimeout(timer)
			reject(new DOMException('Aborted', 'AbortError'))
		}

		signal?.addEventListener('abort', onAbort, { once: true })

		promise
			.then((value) => {
				clearTimeout(timer)
				signal?.removeEventListener('abort', onAbort)
				resolve(value)
			})
			.catch((error: unknown) => {
				clearTimeout(timer)
				signal?.removeEventListener('abort', onAbort)
				reject(error)
			})
	})
}

export class AIGateway {
	private readonly config: AIPlatformConfig

	constructor(config: AIPlatformConfig = loadAIPlatformConfig()) {
		this.config = config
	}

	get activeProviderId() {
		return this.config.provider
	}

	async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
		const provider = createAIProvider(this.config.provider)
		const mergedRequest: AIGenerateRequest = {
			...request,
			model: request.model ?? this.config.model,
			temperature: request.temperature ?? this.config.temperature,
			maxTokens: request.maxTokens ?? this.config.maxTokens,
			responseFormat: 'json',
		}

		let attempt = 0
		let lastError: Error | null = null

		while (attempt <= this.config.maxRetries) {
			try {
				const response = await withTimeout(
					provider.generate(mergedRequest),
					this.config.timeoutMs,
					mergedRequest.signal,
				)

				recordAIObservability({
					requestId: response.requestId,
					timestamp: new Date().toISOString(),
					provider: response.provider,
					model: response.model,
					intent: mergedRequest.metadata?.intent ?? 'unknown',
					knowledgeProvider:
						mergedRequest.metadata?.knowledgeProvider ?? 'unknown',
					knowledgeDomain: mergedRequest.metadata?.knowledgeDomain ?? 'health',
					promptTokens: response.usage.promptTokens,
					completionTokens: response.usage.completionTokens,
					totalTokens: response.usage.totalTokens,
					estimatedCostUsd: response.estimatedCostUsd,
					latencyMs: response.latencyMs,
					confidence: 0,
					cacheHit: false,
				})

				return response
			} catch (error) {
				lastError =
					error instanceof Error ? error : new Error('AI request failed')
				attempt += 1

				if (mergedRequest.signal?.aborted) {
					break
				}
			}
		}

		recordAIObservability({
			requestId: mergedRequest.requestId,
			timestamp: new Date().toISOString(),
			provider: this.config.provider,
			model: mergedRequest.model ?? this.config.model,
			intent: mergedRequest.metadata?.intent ?? 'unknown',
			knowledgeProvider: mergedRequest.metadata?.knowledgeProvider ?? 'unknown',
			knowledgeDomain: mergedRequest.metadata?.knowledgeDomain ?? 'health',
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			estimatedCostUsd: 0,
			latencyMs: 0,
			confidence: 0,
			cacheHit: false,
			error: lastError?.message ?? 'Unknown AI error',
		})

		throw lastError ?? new Error('AI request failed')
	}
}

export const defaultAIGateway = new AIGateway()
