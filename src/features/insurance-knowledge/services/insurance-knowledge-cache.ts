import type { InsuranceKnowledgeGraph } from '@/features/insurance-knowledge/types'

interface CacheEntry {
	graph: InsuranceKnowledgeGraph
	sourceKey: string
	builtAt: number
}

const cache = new Map<string, CacheEntry>()

export function getCachedInsuranceKnowledge(
	personId: string,
	sourceKey: string,
): InsuranceKnowledgeGraph | null {
	const entry = cache.get(personId)

	if (!entry || entry.sourceKey !== sourceKey) {
		return null
	}

	return entry.graph
}

export function setCachedInsuranceKnowledge(
	personId: string,
	sourceKey: string,
	graph: InsuranceKnowledgeGraph,
): void {
	cache.set(personId, {
		graph,
		sourceKey,
		builtAt: Date.now(),
	})
}

export function invalidateInsuranceKnowledgeCache(personId?: string): void {
	if (personId) {
		cache.delete(personId)
		return
	}

	cache.clear()
}

export function getInsuranceKnowledgeCacheStats() {
	return {
		entryCount: cache.size,
		entries: [...cache.entries()].map(([personId, entry]) => ({
			personId,
			sourceKey: entry.sourceKey,
			builtAt: entry.builtAt,
			policyCount: entry.graph.profile.policyHistories.length,
			documentCount: entry.graph.profile.documentIds.length,
		})),
	}
}
