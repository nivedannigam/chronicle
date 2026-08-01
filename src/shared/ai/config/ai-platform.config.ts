import type {
	AIPlatformConfig,
	AIProviderId,
} from '@/shared/ai/types/ai-platform.types'

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

function readProvider(
	value: string | undefined,
	proxyUrl: string,
): AIProviderId {
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
			return proxyUrl ? 'gemini' : 'mock'
	}
}

export function loadAIPlatformConfig(
	overrides: Partial<AIPlatformConfig> = {},
): AIPlatformConfig {
	const proxyUrl =
		overrides.proxyUrl ??
		readEnv('AI_PROXY_URL') ??
		readEnv('ASK_PROXY_URL') ??
		''

	return {
		provider:
			overrides.provider ?? readProvider(readEnv('AI_PROVIDER'), proxyUrl),
		model:
			overrides.model ??
			readEnv('AI_MODEL') ??
			(proxyUrl ? 'gemini-2.0-flash' : 'mock-model'),
		timeoutMs: overrides.timeoutMs ?? Number(readEnv('AI_TIMEOUT') ?? 30_000),
		maxTokens: overrides.maxTokens ?? Number(readEnv('AI_MAX_TOKENS') ?? 4096),
		temperature:
			overrides.temperature ?? Number(readEnv('AI_TEMPERATURE') ?? 0.2),
		maxRetries: overrides.maxRetries ?? Number(readEnv('AI_MAX_RETRIES') ?? 1),
		proxyUrl,
	}
}

export const defaultAIPlatformConfig = loadAIPlatformConfig()

export function isAIPlatformConfigured(): boolean {
	const config = loadAIPlatformConfig()
	return config.provider === 'mock' || Boolean(config.proxyUrl)
}
