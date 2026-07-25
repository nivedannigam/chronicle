import type { IntentDetectionResult } from '@/features/ask/retrieval/intent-detector'
import type { BuiltKnowledgeContext } from '@/features/intelligence/context/context-builder'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'

export interface IntelligenceMemberContext {
	memberId: string | null
	memberName: string | null
	familyMemberNames: string[]
}

/** Domain-agnostic orchestrator input — providers read their slice from `sources`. */
export interface IntelligenceQueryInput {
	userId: string
	question: string
	member: IntelligenceMemberContext
	sources?: Record<string, unknown>
}

export interface SemanticSearchHit {
	id: string
	domain: KnowledgeDomain
	kind: 'report' | 'metric' | 'timeline' | 'entity'
	title: string
	snippet: string
	score: number
	reportId?: string
	metricName?: string
	date?: string
	reportType?: string
	memberId?: string | null
}

export interface IntelligencePipelineContext {
	input: IntelligenceQueryInput
	resolvedQuestion: string
	detection: IntentDetectionResult
	member: IntelligenceMemberContext
	searchHits: SemanticSearchHit[]
	builtContext: BuiltKnowledgeContext
	mergedKnowledge: RetrievedKnowledge | null
	activeDomains: KnowledgeDomain[]
	dataAvailable: boolean
}

/** Builds domain-agnostic `sources` payload from Ask hook data. */
export function buildIntelligenceSources(input: {
	uploadedReports?: unknown[]
	connectorDocuments?: unknown[]
	documents?: unknown[]
}): Record<string, unknown> {
	const sources: Record<string, unknown> = {}

	if (input.uploadedReports?.length) {
		sources.health = { uploadedReports: input.uploadedReports }
	}

	if (input.documents?.length || input.connectorDocuments?.length) {
		sources.documents = {
			uploadedDocuments: input.documents ?? [],
			connectorDocuments: input.connectorDocuments ?? [],
		}
	}

	return sources
}
