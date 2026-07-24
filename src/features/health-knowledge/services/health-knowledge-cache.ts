import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'

interface CacheEntry {
	graph: HealthKnowledgeGraph
	sourceKey: string
	builtAt: number
}

const cache = new Map<string, CacheEntry>()

export function getCachedHealthKnowledge(
	personId: string,
	sourceKey: string,
): HealthKnowledgeGraph | null {
	const entry = cache.get(personId)

	if (!entry || entry.sourceKey !== sourceKey) {
		return null
	}

	return entry.graph
}

export function setCachedHealthKnowledge(
	personId: string,
	sourceKey: string,
	graph: HealthKnowledgeGraph,
): void {
	cache.set(personId, {
		graph,
		sourceKey,
		builtAt: Date.now(),
	})
}

export function invalidateHealthKnowledgeCache(personId?: string): void {
	if (personId) {
		cache.delete(personId)
		return
	}

	cache.clear()
}

export function getHealthKnowledgeCacheStats() {
	return {
		entryCount: cache.size,
		entries: [...cache.entries()].map(([personId, entry]) => ({
			personId,
			sourceKey: entry.sourceKey,
			builtAt: entry.builtAt,
			metricCount: entry.graph.profile.metricHistories.length,
			reportCount: entry.graph.profile.reportIds.length,
		})),
	}
}
