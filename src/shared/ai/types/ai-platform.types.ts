export type AIProviderId = 'mock' | 'openai' | 'gemini' | 'claude'

export type KnowledgeDomainId =
	| 'health'
	| 'documents'
	| 'finance'
	| 'insurance'
	| 'vehicles'
	| 'travel'
	| 'mail'
	| 'tasks'
	| 'family'

export type IntentId = string

export interface AIMessage {
	role: 'system' | 'developer' | 'user' | 'assistant'
	content: string
}

export interface AIGenerateRequest {
	requestId: string
	messages: AIMessage[]
	model?: string
	temperature?: number
	maxTokens?: number
	responseFormat: 'json'
	jsonSchema?: Record<string, unknown>
	signal?: AbortSignal
	metadata?: AIRequestMetadata
}

export interface AIRequestMetadata {
	intent?: IntentId
	classifiedIntent?: string
	knowledgeProvider?: string
	knowledgeDomain?: KnowledgeDomainId
	userId?: string
	selectedTool?: string
	evidenceCount?: number
	estimatedContextTokens?: number
}

export interface AITokenUsage {
	promptTokens: number
	completionTokens: number
	totalTokens: number
}

export interface AIGenerateResponse {
	requestId: string
	content: string
	provider: AIProviderId
	model: string
	usage: AITokenUsage
	latencyMs: number
	estimatedCostUsd: number
}

export interface AIProvider {
	readonly id: AIProviderId
	generate(request: AIGenerateRequest): Promise<AIGenerateResponse>
}

export interface AIPlatformConfig {
	provider: AIProviderId
	model: string
	timeoutMs: number
	maxTokens: number
	temperature: number
	maxRetries: number
	proxyUrl?: string
}
