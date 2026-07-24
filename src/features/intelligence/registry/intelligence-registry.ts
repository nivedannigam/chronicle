import type { ChronicleKnowledgeProvider } from '@/features/intelligence/types/intelligence.types'

const providers = new Map<string, ChronicleKnowledgeProvider>()

export function registerKnowledgeProvider(
	provider: ChronicleKnowledgeProvider,
): void {
	providers.set(provider.domain, provider)
}

export function getKnowledgeProvider(
	domain: string,
): ChronicleKnowledgeProvider | undefined {
	return providers.get(domain)
}

export function getRegisteredProviders(): ChronicleKnowledgeProvider[] {
	return [...providers.values()]
}

export function getAvailableProviders(
	context: Parameters<ChronicleKnowledgeProvider['isAvailable']>[0],
): ChronicleKnowledgeProvider[] {
	return getRegisteredProviders().filter((provider) =>
		provider.isAvailable(context),
	)
}
