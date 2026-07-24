import type { AskAiProviderType } from '@/config/ask-ai'

export interface AiMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

export interface AiCompletionRequest {
	messages: AiMessage[]
	temperature?: number
	maxTokens?: number
	responseFormat?: 'text' | 'json'
	signal?: AbortSignal
}

export interface AiCompletionResponse {
	content: string
	provider: AskAiProviderType
	model: string
	usage: AiTokenUsage
	latencyMs: number
}

export interface AiTokenUsage {
	promptTokens: number
	completionTokens: number
	totalTokens: number
}

export interface AiStreamChunk {
	delta: string
	done: boolean
}

export interface AiProvider {
	readonly name: AskAiProviderType
	complete(request: AiCompletionRequest): Promise<AiCompletionResponse>
	stream?(
		request: AiCompletionRequest,
		onChunk: (chunk: AiStreamChunk) => void,
	): Promise<AiCompletionResponse>
}

export interface AiObservabilityLog {
	id: string
	timestamp: string
	provider: AskAiProviderType
	model: string
	intent: string
	promptSizeChars: number
	promptTokens: number
	completionTokens: number
	totalTokens: number
	latencyMs: number
	retrievedReportCount: number
	retrievedMetricCount: number
	cacheHit: boolean
	error?: string
}
