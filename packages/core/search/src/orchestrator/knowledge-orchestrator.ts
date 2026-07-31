import type {
	DetectedIntent,
	KnowledgeDomain,
	KnowledgeProviderQuery,
	MemberContext,
	ProviderContextResult,
	RetrievedKnowledge,
	SemanticSearchHit,
} from '@chronicle/core-knowledge'
import { toRetrievedKnowledge } from '@chronicle/core-knowledge'
import { contextBuilder } from '../context/context-builder.ts'
import type { BuiltKnowledgeContext } from '../context/context-builder.ts'
import { mergeProviderPackages } from '../orchestrator/context-merger.ts'
import {
	getRegisteredProviders,
	getSupportingProviders,
} from '../registry/knowledge-provider-registry.ts'
import { rankSearchHits } from '../services/search-ranking.service.ts'
import { tokenizeQuery } from '../services/semantic-search.service.ts'

export interface IntelligenceQueryInput {
	userId: string
	question: string
	member: MemberContext
	sources?: Record<string, unknown>
}

export interface OrchestratorInput {
	query: IntelligenceQueryInput
	resolvedQuestion: string
	detection: DetectedIntent
	metricId?: string
}

export interface OrchestratorResult {
	resolvedQuestion: string
	detection: DetectedIntent
	member: MemberContext
	searchHits: SemanticSearchHit[]
	builtContext: BuiltKnowledgeContext
	mergedKnowledge: RetrievedKnowledge | null
	activeDomains: KnowledgeDomain[]
	dataAvailable: boolean
	providerResults: ProviderContextResult[]
	providerErrors: Array<{ providerId: string; error: string }>
}

function buildProviderQuery(
	input: OrchestratorInput,
	searchHits: SemanticSearchHit[],
): KnowledgeProviderQuery {
	return {
		userId: input.query.userId,
		question: input.query.question,
		resolvedQuestion: input.resolvedQuestion,
		intent: input.detection.intent,
		member: input.query.member,
		categoryId: input.detection.categoryId,
		metricId: input.metricId,
		metricName: input.detection.metricName,
		timeRangeYears: input.detection.timeRangeYears,
		searchHits,
		sources: input.query.sources ?? {},
	}
}

function runProviderSearch(query: KnowledgeProviderQuery): SemanticSearchHit[] {
	const hits: SemanticSearchHit[] = []

	for (const provider of getRegisteredProviders()) {
		if (!provider.search || !provider.supports(query)) {
			continue
		}

		try {
			hits.push(...provider.search(query))
		} catch {
			// Provider search failures are isolated — skip this provider's hits.
		}
	}

	return rankSearchHits(hits, {
		memberId: query.member.memberId,
		queryTokens: tokenizeQuery(query.resolvedQuestion),
	})
}

function invokeProviders(
	query: KnowledgeProviderQuery,
): ProviderContextResult[] {
	const providers = getSupportingProviders(query)
	const results: ProviderContextResult[] = []

	for (const provider of providers) {
		try {
			results.push(provider.retrieveContext(query))
		} catch (error) {
			results.push({
				providerId: provider.id,
				domain: provider.domain,
				available: false,
				package: null,
				error:
					error instanceof Error ? error.message : 'Provider retrieval failed',
			})
		}
	}

	return results
}

export function runKnowledgeOrchestrator(
	input: OrchestratorInput,
): OrchestratorResult {
	const baseQuery = buildProviderQuery(input, [])
	const searchHits = runProviderSearch(baseQuery)
	const providerQuery = buildProviderQuery(input, searchHits)
	const providerResults = invokeProviders(providerQuery)
	const merged = mergeProviderPackages(providerResults)

	const builtContext = contextBuilder.build({
		package: merged.package,
		searchHits,
		activeDomains: merged.activeDomains,
	})

	const primaryDomain = merged.activeDomains[0] ?? 'health'
	const mergedKnowledge = builtContext.dataAvailable
		? toRetrievedKnowledge(
				builtContext.package,
				primaryDomain,
				input.detection.intent,
			)
		: null

	return {
		resolvedQuestion: input.resolvedQuestion,
		detection: input.detection,
		member: input.query.member,
		searchHits,
		builtContext,
		mergedKnowledge,
		activeDomains: merged.activeDomains,
		dataAvailable: builtContext.dataAvailable,
		providerResults,
		providerErrors: merged.errors,
	}
}

/** Builds domain-agnostic `sources` payload from Ask hook data. */
export function buildIntelligenceSources(input: {
	uploadedReports?: unknown[]
	storedMetrics?: unknown[]
	connectorDocuments?: unknown[]
	documents?: unknown[]
}): Record<string, unknown> {
	const sources: Record<string, unknown> = {}

	if (input.uploadedReports?.length || input.storedMetrics?.length) {
		sources.health = {
			uploadedReports: input.uploadedReports ?? [],
			storedMetrics: input.storedMetrics ?? [],
		}
	}

	if (input.documents?.length || input.connectorDocuments?.length) {
		sources.documents = {
			uploadedDocuments: input.documents ?? [],
			connectorDocuments: input.connectorDocuments ?? [],
		}
	}

	return sources
}
