import type { KnowledgeContextPackage } from '@/features/intelligence/entities/knowledge-entities'
import { createEmptyContextPackage } from '@/features/intelligence/entities/knowledge-entities'
import type { ProviderContextResult } from '@/features/intelligence/contracts/knowledge-provider.contract'
import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'

export interface MergeContextResult {
	package: KnowledgeContextPackage
	activeDomains: KnowledgeDomain[]
	providerResults: ProviderContextResult[]
	errors: Array<{ providerId: string; error: string }>
}

export function mergeProviderPackages(
	results: ProviderContextResult[],
): MergeContextResult {
	const merged = createEmptyContextPackage()
	const activeDomains: KnowledgeDomain[] = []
	const errors: MergeContextResult['errors'] = []

	for (const result of results) {
		if (result.error) {
			errors.push({ providerId: result.providerId, error: result.error })
		}

		if (!result.available || !result.package) {
			continue
		}

		activeDomains.push(result.domain)
		appendPackage(merged, result.package)
	}

	return {
		package: deduplicatePackage(merged),
		activeDomains,
		providerResults: results,
		errors,
	}
}

function appendPackage(
	target: KnowledgeContextPackage,
	source: KnowledgeContextPackage,
): void {
	target.persons.push(...source.persons)
	target.documents.push(...source.documents)
	target.metrics.push(...source.metrics)
	target.observations.push(...source.observations)
	target.timelineEvents.push(...source.timelineEvents)
	target.findings.push(...source.findings)
	target.references.push(...source.references)
	target.comparisons.push(...source.comparisons)
	target.relationships.push(...source.relationships)
	target.semanticTimeline.push(...source.semanticTimeline)
	target.metricHistories.push(...source.metricHistories)
	target.summaryLines.push(...source.summaryLines)
	target.insights.push(...source.insights)
	target.alerts.push(...source.alerts)
}

function deduplicatePackage(
	pkg: KnowledgeContextPackage,
): KnowledgeContextPackage {
	return {
		...pkg,
		documents: dedupeById(pkg.documents),
		metrics: dedupeByKey(pkg.metrics, (metric) => metric.id),
		observations: dedupeByKey(pkg.observations, (obs) => obs.id),
		timelineEvents: dedupeByKey(pkg.timelineEvents, (event) => event.id),
		findings: dedupeByKey(pkg.findings, (finding) => finding.id),
		references: dedupeReferences(pkg.references),
		comparisons: dedupeByKey(pkg.comparisons, (comparison) => comparison.id),
		relationships: dedupeByKey(
			pkg.relationships,
			(relationship) => relationship.id,
		),
		semanticTimeline: dedupeSemanticTimeline(pkg.semanticTimeline),
		metricHistories: dedupeByKey(
			pkg.metricHistories,
			(history) => history.canonicalId,
		),
		summaryLines: dedupeStrings(pkg.summaryLines),
		insights: dedupeStrings(pkg.insights),
		alerts: dedupeStrings(pkg.alerts),
	}
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
	const seen = new Set<string>()

	return items.filter((item) => {
		if (seen.has(item.id)) {
			return false
		}

		seen.add(item.id)
		return true
	})
}

function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
	const seen = new Set<string>()

	return items.filter((item) => {
		const key = keyFn(item)

		if (seen.has(key)) {
			return false
		}

		seen.add(key)
		return true
	})
}

function dedupeReferences(
	references: KnowledgeContextPackage['references'],
): KnowledgeContextPackage['references'] {
	const seen = new Set<string>()

	return references.filter((reference) => {
		const key = `${reference.documentId}:${reference.metricName ?? ''}`

		if (seen.has(key)) {
			return false
		}

		seen.add(key)
		return true
	})
}

function dedupeStrings(lines: string[]): string[] {
	return [...new Set(lines)]
}

function dedupeSemanticTimeline(
	groups: import('@/features/intelligence/entities/knowledge-entities').KnowledgeSemanticTimelineYear[],
): import('@/features/intelligence/entities/knowledge-entities').KnowledgeSemanticTimelineYear[] {
	const byYear = new Map<
		number,
		import('@/features/intelligence/entities/knowledge-entities').KnowledgeSemanticTimelineYear['events']
	>()

	for (const group of groups) {
		const existing = byYear.get(group.year) ?? []
		byYear.set(group.year, [...existing, ...group.events])
	}

	return [...byYear.entries()]
		.sort(([left], [right]) => left - right)
		.map(([year, events]) => ({
			year,
			events: dedupeByKey(events, (event) => event.id),
		}))
}
