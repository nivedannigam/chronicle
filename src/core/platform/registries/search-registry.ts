import type { KnowledgeProviderQuery } from '@chronicle/core-knowledge'
import type { SemanticSearchHit } from '@chronicle/core-knowledge'
import type { ChronicleSearchContributor } from '@/core/platform/contracts/search-platform.contract'
import { getRegisteredProviders } from '@/core/platform/registries/knowledge-registry'

const contributors = new Map<string, ChronicleSearchContributor>()

export function registerSearchContributor(
	contributor: ChronicleSearchContributor,
): void {
	contributors.set(contributor.id, contributor)
}

export function unregisterSearchContributor(contributorId: string): void {
	contributors.delete(contributorId)
}

export function clearSearchContributors(): void {
	contributors.clear()
}

export function getRegisteredSearchContributors(): ChronicleSearchContributor[] {
	return [...contributors.values()].sort(
		(left, right) => (left.priority ?? 100) - (right.priority ?? 100),
	)
}

export function searchAllContributors(
	query: KnowledgeProviderQuery,
): SemanticSearchHit[] {
	const hits: SemanticSearchHit[] = []

	for (const provider of getRegisteredProviders()) {
		if (!provider.search || !provider.supports(query)) {
			continue
		}

		try {
			hits.push(...provider.search(query))
		} catch {
			// Skip failed provider search.
		}
	}

	for (const contributor of getRegisteredSearchContributors()) {
		if (!contributor.supports(query)) {
			continue
		}

		try {
			hits.push(...contributor.search(query))
		} catch {
			// Skip failed contributor search.
		}
	}

	return hits
}
