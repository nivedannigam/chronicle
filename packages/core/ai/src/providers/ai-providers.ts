import type { AiProvider, AiStreamChunk } from '../types'
import { invokeAskAiThroughRegistry } from '../transport/ask-ai-invoker.ts'

export type { AiProvider }

export interface ProviderCallOptions {
	apiKey?: string
	model: string
	proxyUrl?: string
	azureEndpoint?: string
	azureDeployment?: string
}

export function createOpenAiProvider(options: ProviderCallOptions): AiProvider {
	return {
		name: 'openai',
		async complete(request) {
			if (options.proxyUrl) {
				throw new Error(
					'Unsupported provider requested. Use gemini via supabase.functions.invoke("ask-ai").',
				)
			}

			if (!options.apiKey) {
				throw new Error('OpenAI API key is not configured.')
			}

			const startedAt = performance.now()

			const response = await fetch(
				'https://api.openai.com/v1/chat/completions',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${options.apiKey}`,
					},
					body: JSON.stringify({
						model: options.model,
						messages: request.messages,
						temperature: request.temperature ?? 0.2,
						max_tokens: request.maxTokens ?? 1200,
						response_format:
							request.responseFormat === 'json'
								? { type: 'json_object' }
								: undefined,
					}),
					signal: request.signal,
				},
			)

			if (!response.ok) {
				throw new Error(`OpenAI request failed (${response.status})`)
			}

			const payload = (await response.json()) as {
				choices: Array<{ message: { content: string } }>
				usage?: {
					prompt_tokens: number
					completion_tokens: number
					total_tokens: number
				}
			}

			return {
				content: payload.choices[0]?.message.content ?? '',
				provider: 'openai',
				model: options.model,
				usage: {
					promptTokens: payload.usage?.prompt_tokens ?? 0,
					completionTokens: payload.usage?.completion_tokens ?? 0,
					totalTokens: payload.usage?.total_tokens ?? 0,
				},
				latencyMs: Math.round(performance.now() - startedAt),
			}
		},
	}
}

export function createAzureOpenAiProvider(
	options: ProviderCallOptions,
): AiProvider {
	return {
		name: 'azure-openai',
		async complete(request) {
			if (options.proxyUrl) {
				throw new Error(
					'Unsupported provider requested. Use gemini via supabase.functions.invoke("ask-ai").',
				)
			}

			if (
				!options.apiKey ||
				!options.azureEndpoint ||
				!options.azureDeployment
			) {
				throw new Error('Azure OpenAI is not fully configured.')
			}

			const startedAt = performance.now()
			const url = `${options.azureEndpoint}/openai/deployments/${options.azureDeployment}/chat/completions?api-version=2024-02-15-preview`
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'api-key': options.apiKey,
				},
				body: JSON.stringify({
					messages: request.messages,
					temperature: request.temperature ?? 0.2,
					max_tokens: request.maxTokens ?? 1200,
					response_format:
						request.responseFormat === 'json'
							? { type: 'json_object' }
							: undefined,
				}),
				signal: request.signal,
			})

			if (!response.ok) {
				throw new Error(`Azure OpenAI request failed (${response.status})`)
			}

			const payload = (await response.json()) as {
				choices: Array<{ message: { content: string } }>
				usage?: {
					prompt_tokens: number
					completion_tokens: number
					total_tokens: number
				}
			}

			return {
				content: payload.choices[0]?.message.content ?? '',
				provider: 'azure-openai',
				model: options.azureDeployment,
				usage: {
					promptTokens: payload.usage?.prompt_tokens ?? 0,
					completionTokens: payload.usage?.completion_tokens ?? 0,
					totalTokens: payload.usage?.total_tokens ?? 0,
				},
				latencyMs: Math.round(performance.now() - startedAt),
			}
		},
	}
}

export function createGeminiProvider(options: ProviderCallOptions): AiProvider {
	return {
		name: 'gemini',
		async complete(request) {
			console.log('Calling Ask AI')
			console.log('Provider', 'gemini')
			console.log('Model', options.model)

			const payload = await invokeAskAiThroughRegistry({
				provider: 'gemini',
				model: options.model,
				messages: request.messages,
				responseFormat: request.responseFormat ?? 'json',
			})

			return {
				content: String(payload.content ?? ''),
				provider: 'gemini',
				model: String(payload.model ?? options.model),
				usage: {
					promptTokens:
						(payload.usage as { promptTokens?: number } | undefined)
							?.promptTokens ?? 0,
					completionTokens:
						(payload.usage as { completionTokens?: number } | undefined)
							?.completionTokens ?? 0,
					totalTokens:
						(payload.usage as { totalTokens?: number } | undefined)
							?.totalTokens ?? 0,
				},
				latencyMs:
					(payload.latencyMs as number | undefined) ??
					Math.round(performance.now()),
			}
		},
	}
}

export function createClaudeProvider(options: ProviderCallOptions): AiProvider {
	return {
		name: 'claude',
		async complete(request) {
			if (options.proxyUrl) {
				throw new Error(
					'Unsupported provider requested. Use gemini via supabase.functions.invoke("ask-ai").',
				)
			}

			if (!options.apiKey) {
				throw new Error('Claude API key is not configured.')
			}

			const startedAt = performance.now()
			const system =
				request.messages.find((message) => message.role === 'system')
					?.content ?? ''
			const userMessages = request.messages.filter(
				(message) => message.role !== 'system',
			)

			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': options.apiKey,
					'anthropic-version': '2023-06-01',
				},
				body: JSON.stringify({
					model: options.model,
					max_tokens: request.maxTokens ?? 1200,
					system,
					messages: userMessages.map((message) => ({
						role: message.role === 'assistant' ? 'assistant' : 'user',
						content: message.content,
					})),
				}),
				signal: request.signal,
			})

			if (!response.ok) {
				throw new Error(`Claude request failed (${response.status})`)
			}

			const payload = (await response.json()) as {
				content: Array<{ text: string }>
				usage?: { input_tokens: number; output_tokens: number }
			}

			const promptTokens = payload.usage?.input_tokens ?? 0
			const completionTokens = payload.usage?.output_tokens ?? 0

			return {
				content: payload.content.map((part) => part.text).join('\n'),
				provider: 'claude',
				model: options.model,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: promptTokens + completionTokens,
				},
				latencyMs: Math.round(performance.now() - startedAt),
			}
		},
	}
}

export function createMockAiProvider(): AiProvider {
	return {
		name: 'mock',
		async complete(request) {
			const userMessage =
				[...request.messages]
					.reverse()
					.find((message) => message.role === 'user')?.content ?? ''

			return {
				content: userMessage,
				provider: 'mock',
				model: 'mock-grounded',
				usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
				latencyMs: 120,
			}
		},
		async stream(request, onChunk) {
			const response = await this.complete(request)
			const words = response.content.split(' ')

			for (const [index, word] of words.entries()) {
				onChunk({
					delta: `${index === 0 ? '' : ' '}${word}`,
					done: false,
				})
				await new Promise((resolve) => setTimeout(resolve, 20))
			}

			onChunk({ delta: '', done: true })

			return response
		},
	}
}

export async function simulateStreaming(
	content: string,
	onChunk: (chunk: AiStreamChunk) => void,
): Promise<void> {
	const words = content.split(' ')

	for (const [index, word] of words.entries()) {
		onChunk({
			delta: `${index === 0 ? '' : ' '}${word}`,
			done: false,
		})
		await new Promise((resolve) => setTimeout(resolve, 18))
	}

	onChunk({ delta: '', done: true })
}
