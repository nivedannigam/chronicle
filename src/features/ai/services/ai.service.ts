import { askAiConfig, isAskAiProviderConfigured } from '@/config/ask-ai'
import { createAskAiProvider } from '@/features/ai/providers/ai-provider.factory'
import { simulateStreaming } from '@/features/ai/providers/ai-providers'
import { logAiRequest } from '@/features/ai/services/ai-observability.service'
import type {
	AiCompletionRequest,
	AiCompletionResponse,
	AiObservabilityLog,
	AiStreamChunk,
} from '@/features/ai/types'

interface CacheEntry {
	response: AiCompletionResponse
	expiresAt: number
}

interface CompleteOptions extends AiCompletionRequest {
	cacheKey?: string
	intent?: string
	retrievedReportCount?: number
	retrievedMetricCount?: number
	onStream?: (chunk: AiStreamChunk) => void
}

function hashCacheKey(value: string): string {
	let hash = 0

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(index)
		hash |= 0
	}

	return `ai-${hash}`
}

function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<T> {
	if (signal?.aborted) {
		return Promise.reject(new DOMException('Aborted', 'AbortError'))
	}

	return new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(() => {
			reject(new Error(`AI request timed out after ${timeoutMs}ms`))
		}, timeoutMs)

		const onAbort = () => {
			window.clearTimeout(timer)
			reject(new DOMException('Aborted', 'AbortError'))
		}

		signal?.addEventListener('abort', onAbort, { once: true })

		promise
			.then((value) => {
				window.clearTimeout(timer)
				signal?.removeEventListener('abort', onAbort)
				resolve(value)
			})
			.catch((error: unknown) => {
				window.clearTimeout(timer)
				signal?.removeEventListener('abort', onAbort)
				reject(error)
			})
	})
}

export class AIService {
	private provider: ReturnType<typeof createAskAiProvider> | null = null
	private readonly cache = new Map<string, CacheEntry>()
	private activeController: AbortController | null = null

	private getProvider() {
		if (!isAskAiProviderConfigured()) {
			throw new Error(
				'Ask AI provider is not configured. Set VITE_ASK_PROVIDER to openai, azure-openai, gemini, or claude.',
			)
		}

		if (!this.provider) {
			this.provider = createAskAiProvider(askAiConfig.provider!)
		}

		return this.provider
	}

	cancelActiveRequest(): void {
		this.activeController?.abort()
		this.activeController = null
	}

	async complete(options: CompleteOptions): Promise<AiCompletionResponse> {
		const provider = this.getProvider()
		const controller = new AbortController()
		this.activeController = controller
		const mergedSignal = options.signal ?? controller.signal
		const cacheKey = options.cacheKey ? hashCacheKey(options.cacheKey) : null
		const cached = cacheKey ? this.cache.get(cacheKey) : null

		if (cached && cached.expiresAt > Date.now()) {
			this.recordLog({
				provider: provider.name,
				model: cached.response.model,
				intent: options.intent ?? 'unknown',
				promptSizeChars: JSON.stringify(options.messages).length,
				promptTokens: cached.response.usage.promptTokens,
				completionTokens: cached.response.usage.completionTokens,
				totalTokens: cached.response.usage.totalTokens,
				latencyMs: cached.response.latencyMs,
				retrievedReportCount: options.retrievedReportCount ?? 0,
				retrievedMetricCount: options.retrievedMetricCount ?? 0,
				cacheHit: true,
			})

			return cached.response
		}

		let attempt = 0
		let lastError: Error | null = null

		while (attempt <= askAiConfig.maxRetries) {
			try {
				const execute = async (): Promise<AiCompletionResponse> => {
					if (options.onStream && provider.stream) {
						return provider.stream(
							{ ...options, signal: mergedSignal },
							options.onStream,
						)
					}

					if (options.onStream) {
						const response = await provider.complete({
							...options,
							signal: mergedSignal,
						})
						await simulateStreaming(response.content, options.onStream)

						return response
					}

					return provider.complete({ ...options, signal: mergedSignal })
				}

				const response = await withTimeout(
					execute(),
					askAiConfig.timeoutMs,
					mergedSignal,
				)

				if (cacheKey) {
					this.cache.set(cacheKey, {
						response,
						expiresAt: Date.now() + askAiConfig.cacheTtlMs,
					})
				}

				this.recordLog({
					provider: response.provider,
					model: response.model,
					intent: options.intent ?? 'unknown',
					promptSizeChars: JSON.stringify(options.messages).length,
					promptTokens: response.usage.promptTokens,
					completionTokens: response.usage.completionTokens,
					totalTokens: response.usage.totalTokens,
					latencyMs: response.latencyMs,
					retrievedReportCount: options.retrievedReportCount ?? 0,
					retrievedMetricCount: options.retrievedMetricCount ?? 0,
					cacheHit: false,
				})

				return response
			} catch (error) {
				lastError =
					error instanceof Error ? error : new Error('AI request failed')
				attempt += 1

				if (mergedSignal.aborted) {
					throw lastError
				}
			}
		}

		this.recordLog({
			provider: provider.name,
			model: askAiConfig.model,
			intent: options.intent ?? 'unknown',
			promptSizeChars: JSON.stringify(options.messages).length,
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			latencyMs: 0,
			retrievedReportCount: options.retrievedReportCount ?? 0,
			retrievedMetricCount: options.retrievedMetricCount ?? 0,
			cacheHit: false,
			error: lastError?.message ?? 'Unknown AI error',
		})

		throw lastError ?? new Error('AI request failed')
	}

	private recordLog(entry: Omit<AiObservabilityLog, 'id' | 'timestamp'>): void {
		logAiRequest({
			id: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			...entry,
		})
	}
}

export const aiService = new AIService()
