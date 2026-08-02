import { MAX_LOG_BODY_CHARS } from './constants.ts'

export function maskApiKeyInUrl(url: string): string {
	return url.replace(/([?&]key=)[^&]+/i, '$1***')
}

export function truncateForLog(
	text: string,
	maxChars = MAX_LOG_BODY_CHARS,
): string {
	if (text.length <= maxChars) {
		return text
	}

	return `${text.slice(0, maxChars)}… [truncated ${text.length - maxChars} chars]`
}

export function logAskAiStart(input: {
	correlationId: string
	provider: string
	model: string
	requestUrl: string
	apiKeyPresent: boolean
	promptSizeChars: number
	messageCount: number
	responseFormat: string
}): void {
	console.log('ASK_AI_START')
	console.log(`Correlation ID: ${input.correlationId}`)
	console.log(`Provider: ${input.provider}`)
	console.log(`Model: ${input.model}`)
	console.log(`Request URL: ${maskApiKeyInUrl(input.requestUrl)}`)
	console.log(`API Key Present: ${input.apiKeyPresent}`)
	console.log(`Messages: ${input.messageCount}`)
	console.log(`Prompt Size: ${input.promptSizeChars} chars`)
	console.log(`Response Format: ${input.responseFormat}`)
}

export function logSelectedProvider(provider: string): void {
	console.log(`Selected Provider: ${provider}`)
}

export function logGeminiResponse(input: {
	status: number
	latencyMs: number
	rawBody: string
}): void {
	console.log(`Gemini Status: ${input.status}`)
	console.log(`Gemini Latency: ${Math.round(input.latencyMs)}ms`)
	console.log('Gemini Body:')
	console.log(truncateForLog(input.rawBody))
}

export function logTokenUsage(input: {
	promptTokens: number
	completionTokens: number
	totalTokens: number
}): void {
	console.log(
		`Token Usage — prompt: ${input.promptTokens}, completion: ${input.completionTokens}, total: ${input.totalTokens}`,
	)
}

export function logRequestFailed(input: {
	correlationId: string
	provider?: string
	model?: string
	status?: number
	message: string
}): void {
	console.error(
		JSON.stringify({
			service: 'ask-ai',
			event: 'request_failed',
			correlationId: input.correlationId,
			provider: input.provider,
			model: input.model,
			status: input.status,
			message: input.message,
		}),
	)
}
