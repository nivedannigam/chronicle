export type AskAiProvider = 'openai' | 'azure-openai' | 'gemini' | 'claude'

export interface AskAiMessage {
	role: string
	content: string
}

export interface AskAiRequestBody {
	action?: 'ping'
	provider?: AskAiProvider
	model?: string
	messages?: AskAiMessage[]
	responseFormat?: 'text' | 'json'
}

export interface TokenUsage {
	promptTokens: number
	completionTokens: number
	totalTokens: number
}

export interface RequestTimings {
	authMs: number
	promptMs: number
	geminiMs: number
	parseMs: number
	totalMs: number
}

export interface GeminiCallResult {
	reply: string
	usage: TokenUsage
	status: number
	rawBody: string
	geminiMs: number
	parseMs: number
}

export interface ProviderErrorPayload {
	provider: 'gemini'
	model: string
	status: number
	message: string
	correlationId: string
	providerResponse: string
	timings?: RequestTimings
}
