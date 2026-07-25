import type { KnowledgeContextPackage } from '@/features/intelligence/entities/knowledge-entities'
import type {
	KnowledgeDocument,
	KnowledgeMetric,
	KnowledgeReference,
	KnowledgeTimelineEvent,
} from '@/features/intelligence/entities/knowledge-entities'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import type {
	AskIntent,
	KnowledgeDomain,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'

/** Domain-agnostic query passed to every Knowledge Provider. */
export interface KnowledgeProviderQuery {
	userId: string
	question: string
	resolvedQuestion: string
	intent: AskIntent
	member: IntelligenceMemberContext
	categoryId?: string
	metricId?: string
	metricName?: string
	timeRangeYears?: number
	searchHits?: SemanticSearchHit[]
	/** Caller-supplied domain data keyed by provider id (e.g. `{ health: { uploadedReports } }`). */
	sources: Record<string, unknown>
}

export interface ProviderContextResult {
	providerId: string
	domain: KnowledgeDomain
	available: boolean
	package: KnowledgeContextPackage | null
	error?: string
	unavailableReason?: string
}

/**
 * Chronicle Knowledge Provider contract.
 * Future modules (Finance, Travel, Insurance) implement this interface and self-register.
 */
export interface ChronicleKnowledgeProvider {
	readonly id: string
	readonly domain: KnowledgeDomain
	readonly label: string
	readonly priority?: number

	supports(query: KnowledgeProviderQuery): boolean
	search?(query: KnowledgeProviderQuery): SemanticSearchHit[]

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult
	retrieveTimeline?(query: KnowledgeProviderQuery): KnowledgeTimelineEvent[]
	retrieveEntities?(query: KnowledgeProviderQuery): KnowledgeDocument[]
	retrieveMetrics?(query: KnowledgeProviderQuery): KnowledgeMetric[]
	retrieveEvidence?(query: KnowledgeProviderQuery): KnowledgeReference[]
}
