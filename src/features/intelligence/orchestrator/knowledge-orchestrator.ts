import type { KnowledgeProviderQuery } from '@/features/intelligence/contracts/knowledge-provider.contract'
import { toRetrievedKnowledge } from '@/features/intelligence/adapters/retrieved-knowledge.adapter'
import { contextBuilder } from '@/features/intelligence/context/context-builder'
import { mergeProviderPackages } from '@/features/intelligence/orchestrator/context-merger'
import {
	getRegisteredProviders,
	getSupportingProviders,
} from '@/features/intelligence/registry/intelligence-registry'
import { rankSearchHits } from '@/features/intelligence/services/search-ranking.service'
import { tokenizeQuery } from '@/features/intelligence/services/semantic-search.service'
import type {
	IntelligenceMemberContext,
	IntelligenceQueryInput,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'
import type { BuiltKnowledgeContext } from '@/features/intelligence/context/context-builder'
import type { ProviderContextResult } from '@/features/intelligence/contracts/knowledge-provider.contract'
import type { IntentDetectionResult } from '@/features/ask/retrieval/intent-detector'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'

export interface OrchestratorInput {
	query: IntelligenceQueryInput
	resolvedQuestion: string
	detection: IntentDetectionResult
	metricId?: string
}

export interface OrchestratorResult {
	resolvedQuestion: string
	detection: IntentDetectionResult
	member: IntelligenceMemberContext
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
