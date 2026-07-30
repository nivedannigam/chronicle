import type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderQuery,
} from '@chronicle/core-knowledge'

const providers = new Map<string, ChronicleKnowledgeProvider>()

export function registerKnowledgeProvider(
	provider: ChronicleKnowledgeProvider,
): void {
	providers.set(provider.id, provider)
}

export function unregisterKnowledgeProvider(providerId: string): void {
	providers.delete(providerId)
}

export function clearKnowledgeProviders(): void {
	providers.clear()
}

export function getKnowledgeProvider(
	providerId: string,
): ChronicleKnowledgeProvider | undefined {
	return providers.get(providerId)
}

export function getRegisteredProviders(): ChronicleKnowledgeProvider[] {
	return [...providers.values()].sort(
		(left, right) => (left.priority ?? 100) - (right.priority ?? 100),
	)
}

export function getSupportingProviders(
	query: KnowledgeProviderQuery,
): ChronicleKnowledgeProvider[] {
	return getRegisteredProviders().filter((provider) => provider.supports(query))
}

/** @deprecated Use getSupportingProviders — kept for transitional callers. */
export function getAvailableProviders(
	context: KnowledgeProviderQuery,
): ChronicleKnowledgeProvider[] {
	return getSupportingProviders(context)
}

export function getRegisteredProviderCount(): number {
	return providers.size
}

export function getRegisteredProviderIds(): string[] {
	return [...providers.keys()]
}
