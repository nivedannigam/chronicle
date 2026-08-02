import {
	GEMINI_BASE_URL,
	GEMINI_MODEL,
	SIMPLIFIED_PING_PROMPT,
} from './constants.ts'
import { logAskAiStart, logGeminiResponse, logTokenUsage } from './logging.ts'
import type { AskAiRequestBody, GeminiCallResult, TokenUsage } from './types.ts'

export function resolveGeminiApiKey(): string | null {
	return (
		Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_AI_API_KEY') ?? null
	)
}

export function buildGeminiRequestUrl(model: string, apiKey: string): string {
	return `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`
}

export function buildSimplifiedGeminiBody(): Record<string, unknown> {
	return {
		contents: [
			{
				parts: [{ text: SIMPLIFIED_PING_PROMPT }],
			},
		],
	}
}

export function computeIncomingPromptSize(body: AskAiRequestBody): number {
	return (body.messages ?? []).reduce(
		(total, message) => total + message.content.length,
		0,
	)
}

function parseGeminiPayload(rawBody: string): {
	reply: string
	usage: TokenUsage
} {
	const payload = JSON.parse(rawBody) as {
		candidates?: Array<{
			content?: { parts?: Array<{ text?: string }> }
		}>
		usageMetadata?: {
			promptTokenCount?: number
			candidatesTokenCount?: number
			totalTokenCount?: number
		}
		error?: { message?: string }
	}

	if (payload.error?.message) {
		throw new Error(payload.error.message)
	}

	const reply =
		payload.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? '')
			.join('') ?? ''

	const promptTokens = payload.usageMetadata?.promptTokenCount ?? 0
	const completionTokens = payload.usageMetadata?.candidatesTokenCount ?? 0
	const totalTokens =
		payload.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens

	return {
		reply,
		usage: {
			promptTokens,
			completionTokens,
			totalTokens,
		},
	}
}

export async function callGeminiSimplified(input: {
	correlationId: string
	body: AskAiRequestBody
}): Promise<GeminiCallResult> {
	const apiKey = resolveGeminiApiKey()
	const model = GEMINI_MODEL
	const requestUrl = buildGeminiRequestUrl(model, apiKey ?? '')
	const requestBody = buildSimplifiedGeminiBody()
	const messageCount = input.body.messages?.length ?? 0
	const promptSizeChars = computeIncomingPromptSize(input.body)

	logAskAiStart({
		correlationId: input.correlationId,
		provider: 'gemini',
		model,
		requestUrl,
		apiKeyPresent: Boolean(apiKey),
		promptSizeChars,
		messageCount,
		responseFormat: input.body.responseFormat ?? 'text',
	})

	if (!apiKey) {
		throw new GeminiRequestError({
			status: 500,
			message: 'GEMINI_API_KEY is not configured',
			providerResponse: 'Missing GEMINI_API_KEY / GOOGLE_AI_API_KEY secret',
		})
	}

	console.log('Gemini request started')

	const geminiStarted = performance.now()
	const response = await fetch(requestUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
	})
	const geminiMs = performance.now() - geminiStarted
	const rawBody = await response.text()

	logGeminiResponse({
		status: response.status,
		latencyMs: geminiMs,
		rawBody,
	})

	if (!response.ok) {
		throw new GeminiRequestError({
			status: response.status,
			message: extractProviderErrorMessage(rawBody, response.status),
			providerResponse: rawBody,
		})
	}

	const parseStarted = performance.now()
	const parsed = parseGeminiPayload(rawBody)
	const parseMs = performance.now() - parseStarted

	console.log('Gemini request completed')
	console.log(`Latency: ${Math.round(geminiMs)}ms`)
	logTokenUsage(parsed.usage)

	return {
		reply: parsed.reply,
		usage: parsed.usage,
		status: response.status,
		rawBody,
		geminiMs,
		parseMs,
	}
}

export class GeminiRequestError extends Error {
	readonly status: number
	readonly providerResponse: string

	constructor(input: {
		status: number
		message: string
		providerResponse: string
	}) {
		super(input.message)
		this.name = 'GeminiRequestError'
		this.status = input.status
		this.providerResponse = input.providerResponse
	}
}

function extractProviderErrorMessage(rawBody: string, status: number): string {
	try {
		const payload = JSON.parse(rawBody) as {
			error?: { message?: string; status?: string }
		}

		if (payload.error?.message) {
			return payload.error.message
		}
	} catch {
		// Fall through to generic message.
	}

	return `Gemini request failed with HTTP ${status}`
}
