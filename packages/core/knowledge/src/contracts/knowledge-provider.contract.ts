import type { KnowledgeContextPackage } from '../entities/knowledge-entities.ts'
import type {
	KnowledgeDocument,
	KnowledgeMetric,
	KnowledgeReference,
	KnowledgeTimelineEvent,
} from '../entities/knowledge-entities.ts'
import type { AskIntent } from '../types/ask-intent.types.ts'
import type { KnowledgeDomain } from '../types/knowledge-domain.types.ts'
import type { MemberContext } from '../types/member-context.types.ts'
import type { SemanticSearchHit } from '../types/search-hit.types.ts'

/** Domain-agnostic query passed to every Knowledge Provider. */
export interface KnowledgeProviderQuery {
	userId: string
	question: string
	resolvedQuestion: string
	intent: AskIntent
	member: MemberContext
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
 * Domain modules (Health, Documents, Finance) implement this and self-register.
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
