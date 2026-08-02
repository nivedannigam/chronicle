import type {
	AIPlatformConfig,
	AIProviderId,
} from '@/shared/ai/types/ai-platform.types'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'

function readEnv(name: string): string | undefined {
	const viteName = `VITE_${name}`

	if (typeof import.meta !== 'undefined' && import.meta.env) {
		const env = import.meta.env as Record<string, string | undefined>
		return env[name] ?? env[viteName]
	}

	if (typeof process !== 'undefined' && process.env) {
		return process.env[name] ?? process.env[viteName]
	}

	return undefined
}

export function isSupabaseClientConfigured(): boolean {
	return Boolean(readEnv('SUPABASE_URL') && readEnv('SUPABASE_ANON_KEY'))
}

function readProvider(value: string | undefined): AIProviderId {
	switch (value?.toLowerCase()) {
		case 'openai':
			return 'openai'
		case 'gemini':
			return 'gemini'
		case 'claude':
			return 'claude'
		case 'mock':
			return 'mock'
		default:
			return isSupabaseClientConfigured() ? 'gemini' : 'mock'
	}
}

export function loadAIPlatformConfig(
	overrides: Partial<AIPlatformConfig> = {},
): AIPlatformConfig {
	return {
		provider: overrides.provider ?? readProvider(readEnv('AI_PROVIDER')),
		model: overrides.model ?? readEnv('AI_MODEL') ?? GEMINI_MODEL,
		timeoutMs: overrides.timeoutMs ?? Number(readEnv('AI_TIMEOUT') ?? 30_000),
		maxTokens: overrides.maxTokens ?? Number(readEnv('AI_MAX_TOKENS') ?? 4096),
		temperature:
			overrides.temperature ?? Number(readEnv('AI_TEMPERATURE') ?? 0.2),
		maxRetries: overrides.maxRetries ?? Number(readEnv('AI_MAX_RETRIES') ?? 1),
		proxyUrl: overrides.proxyUrl ?? '',
	}
}

export const defaultAIPlatformConfig = loadAIPlatformConfig()

export function isAIPlatformConfigured(): boolean {
	const config = loadAIPlatformConfig()
	return config.provider === 'gemini' && isSupabaseClientConfigured()
}

export function getAIPlatformConfigurationError(): string | null {
	if (isAIPlatformConfigured()) {
		return null
	}

	if (!isSupabaseClientConfigured()) {
		return 'Ask AI requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
	}

	const config = loadAIPlatformConfig()

	if (config.provider !== 'gemini') {
		return `Ask AI requires provider gemini via supabase.functions.invoke("ask-ai"). Current provider: ${config.provider}.`
	}

	return 'Ask AI is not configured.'
}
