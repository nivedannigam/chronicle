import type { KnowledgeContextPackage } from '@/features/intelligence/entities/knowledge-entities'
import { isContextPackageEmpty } from '@/features/intelligence/entities/knowledge-entities'
import type { KnowledgeReference } from '@/features/intelligence/entities/knowledge-entities'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'

export interface ContextBuilderInput {
	package: KnowledgeContextPackage
	searchHits: SemanticSearchHit[]
	activeDomains: KnowledgeDomain[]
	maxTokens?: number
}

export interface BuiltKnowledgeContext {
	package: KnowledgeContextPackage
	citations: KnowledgeReference[]
	contextJson: string
	tokenEstimate: number
	activeDomains: KnowledgeDomain[]
	dataAvailable: boolean
}

const DEFAULT_MAX_TOKENS = 6000
const CHARS_PER_TOKEN = 4

export class ContextBuilder {
	build(input: ContextBuilderInput): BuiltKnowledgeContext {
		const maxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS
		const ranked = rankAndTrimPackage(
			input.package,
			input.searchHits,
			maxTokens,
		)
		const citations = generateCitations(ranked, input.searchHits)
		const contextJson = serializeForLlm(ranked, input.activeDomains, citations)
		const tokenEstimate = Math.ceil(contextJson.length / CHARS_PER_TOKEN)

		return {
			package: ranked,
			citations,
			contextJson,
			tokenEstimate,
			activeDomains: input.activeDomains,
			dataAvailable: !isContextPackageEmpty(ranked),
		}
	}
}

export const contextBuilder = new ContextBuilder()

function rankAndTrimPackage(
	pkg: KnowledgeContextPackage,
	searchHits: SemanticSearchHit[],
	maxTokens: number,
): KnowledgeContextPackage {
	const hitScores = new Map(
		searchHits.map((hit) => [hit.reportId ?? hit.id, hit.score]),
	)

	const metrics = [...pkg.metrics]
		.map((metric) => ({
			...metric,
			relevanceScore:
				(metric.relevanceScore ?? 0) + (hitScores.get(metric.documentId) ?? 0),
		}))
		.sort(
			(left, right) => (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0),
		)

	const documents = [...pkg.documents].sort(
		(left, right) =>
			new Date(right.date).getTime() - new Date(left.date).getTime(),
	)

	const observations = [...pkg.observations].sort(
		(left, right) =>
			new Date(right.observedAt).getTime() -
			new Date(left.observedAt).getTime(),
	)

	const timelineEvents = [...pkg.timelineEvents]

	const trimmed: KnowledgeContextPackage = {
		...pkg,
		documents: documents.slice(0, 4),
		metrics: metrics.slice(0, 12),
		observations: observations.slice(0, 24),
		timelineEvents: timelineEvents.slice(0, 6),
		findings: pkg.findings.slice(0, 10),
		references: preferSemanticReferences(pkg.references, searchHits).slice(
			0,
			16,
		),
		comparisons: pkg.comparisons.slice(0, 4),
		relationships: pkg.relationships.slice(0, 12),
		semanticTimeline: pkg.semanticTimeline.slice(0, 8),
		metricHistories: pkg.metricHistories.slice(0, 12),
		summaryLines: pkg.summaryLines.slice(0, 10),
		insights: pkg.insights.slice(0, 10),
		alerts: pkg.alerts.slice(0, 6),
	}

	return trimToTokenBudget(trimmed, maxTokens)
}

function trimToTokenBudget(
	pkg: KnowledgeContextPackage,
	maxTokens: number,
): KnowledgeContextPackage {
	let json = JSON.stringify(pkg)
	const budget = maxTokens * CHARS_PER_TOKEN

	while (json.length > budget && pkg.observations.length > 4) {
		pkg = { ...pkg, observations: pkg.observations.slice(0, -4) }
		json = JSON.stringify(pkg)
	}

	while (json.length > budget && pkg.metrics.length > 4) {
		pkg = { ...pkg, metrics: pkg.metrics.slice(0, -2) }
		json = JSON.stringify(pkg)
	}

	return pkg
}

function preferSemanticReferences(
	references: KnowledgeReference[],
	searchHits: SemanticSearchHit[],
): KnowledgeReference[] {
	const semantic = [...references]
	const ocrHits = searchHits.filter((hit) => hit.id.startsWith('ocr-'))

	for (const hit of ocrHits.slice(0, 2)) {
		if (!hit.reportId) {
			continue
		}

		semantic.push({
			id: `ocr-support-${hit.id}`,
			documentId: hit.reportId,
			documentTitle: hit.title,
			date: hit.date ?? '',
			snippet: hit.snippet,
			source: hit.domain,
			sourceProvider: 'ocr-support',
			relevanceScore: hit.score * 0.5,
		})
	}

	return semantic.sort((left, right) => {
		const leftOcr = left.sourceProvider === 'ocr-support' ? 0 : 1
		const rightOcr = right.sourceProvider === 'ocr-support' ? 0 : 1

		if (leftOcr !== rightOcr) {
			return rightOcr - leftOcr
		}

		return (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0)
	})
}

function generateCitations(
	pkg: KnowledgeContextPackage,
	searchHits: SemanticSearchHit[],
): KnowledgeReference[] {
	const citations = [...pkg.references]

	for (const hit of searchHits.slice(0, 6)) {
		if (!hit.reportId) {
			continue
		}

		if (citations.some((citation) => citation.documentId === hit.reportId)) {
			continue
		}

		citations.push({
			id: `search-${hit.id}`,
			documentId: hit.reportId,
			documentTitle: hit.title,
			metricName: hit.metricName,
			date: hit.date ?? '',
			snippet: hit.snippet,
			source: hit.domain,
			sourceProvider: hit.domain,
			relevanceScore: hit.score,
		})
	}

	return citations.slice(0, 12)
}

function serializeForLlm(
	pkg: KnowledgeContextPackage,
	activeDomains: KnowledgeDomain[],
	citations: KnowledgeReference[],
): string {
	return JSON.stringify(
		{
			activeDomains,
			semanticMemory: {
				summaryLines: pkg.summaryLines,
				metricHistories: pkg.metricHistories,
				semanticTimeline: pkg.semanticTimeline,
				relationships: pkg.relationships,
				metrics: pkg.metrics,
				timelineEvents: pkg.timelineEvents,
				observations: pkg.observations,
				findings: pkg.findings,
				insights: pkg.insights,
				alerts: pkg.alerts,
				comparisons: pkg.comparisons,
			},
			supportingDocuments: pkg.documents,
			citations,
		},
		null,
		2,
	)
}
