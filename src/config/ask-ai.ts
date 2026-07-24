export type AskAiProviderType = 'openai' | 'azure-openai' | 'gemini' | 'claude'

function readProvider(value: string | undefined): AskAiProviderType | null {
	if (
		value === 'openai' ||
		value === 'azure-openai' ||
		value === 'gemini' ||
		value === 'claude'
	) {
		return value
	}

	return null
}

export const askAiConfig = {
	provider: readProvider(import.meta.env.VITE_ASK_PROVIDER),
	model: import.meta.env.VITE_ASK_MODEL ?? 'gpt-4o-mini',
	timeoutMs: Number(import.meta.env.VITE_ASK_TIMEOUT_MS ?? 30_000),
	maxRetries: Number(import.meta.env.VITE_ASK_MAX_RETRIES ?? 2),
	cacheTtlMs: Number(import.meta.env.VITE_ASK_CACHE_TTL_MS ?? 300_000),
	proxyUrl: import.meta.env.VITE_ASK_PROXY_URL ?? '',
	apiKey: import.meta.env.VITE_ASK_API_KEY ?? '',
	azureEndpoint: import.meta.env.VITE_ASK_AZURE_ENDPOINT ?? '',
	azureDeployment: import.meta.env.VITE_ASK_AZURE_DEPLOYMENT ?? '',
} as const

export function isAskAiProviderConfigured(
	provider: AskAiProviderType | null = askAiConfig.provider,
): boolean {
	return provider != null
}
