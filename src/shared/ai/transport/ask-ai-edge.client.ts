import { supabase } from '@/lib/supabase'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'

export class AskAiEdgeConfigurationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AskAiEdgeConfigurationError'
	}
}

export class AskAiEdgeInvokeError extends Error {
	readonly statusCode?: number
	readonly correlationId?: string
	readonly providerResponse?: string

	constructor(
		message: string,
		options?: {
			statusCode?: number
			correlationId?: string
			providerResponse?: string
		},
	) {
		super(message)
		this.name = 'AskAiEdgeInvokeError'
		this.statusCode = options?.statusCode
		this.correlationId = options?.correlationId
		this.providerResponse = options?.providerResponse
	}
}

export interface AskAiEdgeInvokeBody {
	provider: 'gemini'
	model: string
	messages: Array<{ role: string; content: string }>
	responseFormat?: 'text' | 'json'
	temperature?: number
	maxTokens?: number
}

export interface AskAiEdgeInvokeResult {
	content: string
	provider: 'gemini'
	model: string
	correlationId?: string
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
	latencyMs: number
}

function readSupabaseUrl(): string | undefined {
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		return import.meta.env.VITE_SUPABASE_URL as string | undefined
	}

	return undefined
}

function readSupabaseAnonKey(): string | undefined {
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		return import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
	}

	return undefined
}

export function isAskAiEdgeConfigured(): boolean {
	return Boolean(readSupabaseUrl() && readSupabaseAnonKey())
}

export function assertAskAiEdgeConfigured(): void {
	if (!isAskAiEdgeConfigured()) {
		throw new AskAiEdgeConfigurationError(
			'Ask AI Edge Function is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, deploy the ask-ai function, and set VITE_AI_PROVIDER=gemini.',
		)
	}
}

export async function invokeAskAiEdgeFunction(
	body: AskAiEdgeInvokeBody,
): Promise<AskAiEdgeInvokeResult> {
	assertAskAiEdgeConfigured()

	const config = loadAIPlatformConfig()
	const provider = body.provider
	const model = body.model || config.model || GEMINI_MODEL

	console.log('Calling Ask AI')
	console.log('Provider', provider)
	console.log('Model', model)

	const { data, error } = await supabase.functions.invoke('ask-ai', {
		body: {
			provider,
			model,
			messages: body.messages,
			responseFormat: body.responseFormat ?? 'json',
			temperature: body.temperature,
			maxTokens: body.maxTokens,
		},
	})

	if (error) {
		throw new AskAiEdgeInvokeError(error.message)
	}

	const payload = data as {
		content?: string
		reply?: string
		provider?: string
		model?: string
		correlationId?: string
		latencyMs?: number
		status?: number
		message?: string
		providerResponse?: string
		error?: string
		usage?: {
			promptTokens?: number
			completionTokens?: number
			totalTokens?: number
		}
	}

	if (!payload || payload.error) {
		throw new AskAiEdgeInvokeError(
			payload?.error ?? 'Ask AI edge function failed',
		)
	}

	if (payload.status && payload.status >= 400) {
		throw new AskAiEdgeInvokeError(
			payload.message ?? 'Ask AI edge function failed',
			{
				statusCode: payload.status,
				correlationId: payload.correlationId,
				providerResponse: payload.providerResponse,
			},
		)
	}

	const content = payload.content ?? payload.reply ?? ''

	if (!content) {
		throw new AskAiEdgeInvokeError(
			'Ask AI edge function returned an empty response',
			{
				correlationId: payload.correlationId,
				providerResponse: JSON.stringify(payload),
			},
		)
	}

	const promptTokens = payload.usage?.promptTokens ?? 0
	const completionTokens = payload.usage?.completionTokens ?? 0

	return {
		content,
		provider: 'gemini',
		model: payload.model ?? model,
		correlationId: payload.correlationId,
		usage: {
			promptTokens,
			completionTokens,
			totalTokens:
				payload.usage?.totalTokens ?? promptTokens + completionTokens,
		},
		latencyMs: payload.latencyMs ?? 0,
	}
}
