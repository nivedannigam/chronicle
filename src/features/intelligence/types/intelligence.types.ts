import type { BuiltKnowledgeContext } from '@/features/intelligence/context/context-builder'
import type { DetectedIntent } from '@chronicle/core-knowledge'
import type { RetrievedKnowledge } from '@chronicle/core-knowledge'
import type { KnowledgeDomain } from '@chronicle/core-knowledge'
import type { MemberContext } from '@chronicle/core-knowledge'
import type { SemanticSearchHit } from '@chronicle/core-knowledge'
import type {
	IntelligenceQueryInput,
	OrchestratorInput,
} from '@chronicle/core-search'

/** @deprecated Use MemberContext from @chronicle/core-knowledge */
export type IntelligenceMemberContext = MemberContext

export type { IntelligenceQueryInput, OrchestratorInput, SemanticSearchHit }

export interface IntelligencePipelineContext {
	input: IntelligenceQueryInput
	resolvedQuestion: string
	detection: DetectedIntent
	member: MemberContext
	searchHits: SemanticSearchHit[]
	builtContext: BuiltKnowledgeContext
	mergedKnowledge: RetrievedKnowledge | null
	activeDomains: KnowledgeDomain[]
	dataAvailable: boolean
}

export { buildIntelligenceSources } from '@chronicle/core-search'
