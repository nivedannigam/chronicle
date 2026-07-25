import {
	detectIntent,
	resolveQuestionWithContext,
} from '@/features/ask/retrieval/intent-detector'
import { normalizeMetricName } from '@/features/document-intelligence/extraction/metric-normalization.engine'
import { documentsKnowledgeProvider } from '@/features/intelligence/providers/documents-knowledge.provider'
import { healthKnowledgeProvider } from '@/features/intelligence/providers/health-knowledge.provider'
import {
	getAvailableProviders,
	getRegisteredProviders,
	registerKnowledgeProvider,
} from '@/features/intelligence/registry/intelligence-registry'
import { generateFollowUpQuestions } from '@/features/intelligence/services/follow-up-generator.service'
import { rankSearchHits } from '@/features/intelligence/services/search-ranking.service'
import { tokenizeQuery } from '@/features/intelligence/services/semantic-search.service'
import {
	buildMemorySessionKey,
	resolveMemberFromQuestion,
} from '@/features/intelligence/services/member-context.service'
import type {
	IntelligencePipelineContext,
	IntelligenceQueryInput,
	KnowledgeProviderContext,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'
import { createEmptyKnowledge } from '@/features/intelligence/types/intelligence.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'

let bootstrapped = false

export function bootstrapIntelligenceProviders(): void {
	if (bootstrapped) {
		return
	}

	registerKnowledgeProvider(healthKnowledgeProvider)
	registerKnowledgeProvider(documentsKnowledgeProvider)
	bootstrapped = true
}

function mergeProviderResults(
	intent: RetrievedKnowledge['intent'],
	results: Array<{ knowledge: RetrievedKnowledge | null }>,
): RetrievedKnowledge {
	const merged = createEmptyKnowledge(intent)

	for (const result of results) {
		if (!result.knowledge) {
			continue
		}

		merged.domain = result.knowledge.domain
		merged.reports.push(...result.knowledge.reports)
		merged.metrics.push(...result.knowledge.metrics)
		merged.timelines.push(...result.knowledge.timelines)
		merged.trends.push(...result.knowledge.trends)
		merged.observations.push(...result.knowledge.observations)
		merged.relationships.push(...result.knowledge.relationships)
		merged.insights.push(...result.knowledge.insights)
		merged.alerts.push(...result.knowledge.alerts)
		merged.summaryLines.push(...result.knowledge.summaryLines)
		merged.comparisons.push(...result.knowledge.comparisons)
	}

	return merged
}

function runProviderSearch(
	context: KnowledgeProviderContext,
): SemanticSearchHit[] {
	const hits: SemanticSearchHit[] = []

	for (const provider of getRegisteredProviders()) {
		if (!provider.search || !provider.isAvailable(context)) {
			continue
		}

		hits.push(...provider.search(context))
	}

	return rankSearchHits(hits, {
		memberId: context.member.memberId,
		queryTokens: tokenizeQuery(context.resolvedQuestion),
	})
}

export function runIntelligencePipeline(
	input: IntelligenceQueryInput,
): IntelligencePipelineContext {
	bootstrapIntelligenceProviders()

	const sessionKey = buildMemorySessionKey(input.userId, input.member.memberId)
	const previousTopic = conversationMemory.getPreviousTopic(sessionKey)
	const resolvedQuestion = resolveQuestionWithContext(
		input.question,
		previousTopic,
	)
	const detection = detectIntent(resolvedQuestion, previousTopic)
	const metricId = detection.metricName
		? (normalizeMetricName(detection.metricName).canonicalId ?? undefined)
		: undefined

	const providerContext: KnowledgeProviderContext = {
		userId: input.userId,
		question: input.question,
		intent: detection.intent,
		resolvedQuestion,
		member: input.member,
		categoryId: detection.categoryId,
		metricId,
		metricName: detection.metricName,
		timeRangeYears: detection.timeRangeYears,
		uploadedReports: input.uploadedReports ?? [],
		connectorDocuments: input.connectorDocuments ?? [],
	}

	const searchHits = runProviderSearch(providerContext)
	providerContext.searchHits = searchHits

	const availableProviders = getAvailableProviders(providerContext)
	const providerResults = availableProviders.map((provider) =>
		provider.retrieve(providerContext),
	)
	const mergedKnowledge = mergeProviderResults(
		detection.intent,
		providerResults,
	)

	const dataAvailable =
		mergedKnowledge.reports.length > 0 ||
		mergedKnowledge.metrics.length > 0 ||
		mergedKnowledge.summaryLines.length > 0 ||
		mergedKnowledge.insights.length > 0

	return {
		input,
		resolvedQuestion,
		detection,
		member: input.member,
		searchHits,
		mergedKnowledge: dataAvailable ? mergedKnowledge : null,
		activeDomains: providerResults
			.filter((result) => result.available)
			.map((result) => result.domain),
		dataAvailable,
	}
}

export function resolveIntelligenceMember(input: {
	question: string
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: import('@/features/family/types/family.types').FamilyMemberWithAliases[]
}) {
	return resolveMemberFromQuestion(input)
}

export { generateFollowUpQuestions }
