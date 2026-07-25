import type { IntentDetectionResult } from '@/features/ask/retrieval/intent-detector'
import type {
	IntelligenceMemberContext,
	IntelligenceQueryInput,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

export interface IntentStageInput {
	question: string
	sessionKey: string
}

export interface IntentStageOutput {
	resolvedQuestion: string
	detection: IntentDetectionResult
}

export interface MemberStageOutput {
	member: IntelligenceMemberContext
}

export interface SearchStageInput {
	query: import('@/features/intelligence/contracts/knowledge-provider.contract').KnowledgeProviderQuery
}

export interface SearchStageOutput {
	searchHits: SemanticSearchHit[]
}

export interface RetrieveStageInput {
	query: import('@/features/intelligence/contracts/knowledge-provider.contract').KnowledgeProviderQuery
}

export interface RetrieveStageOutput {
	knowledge: RetrievedKnowledge | null
	activeDomains: import('@/features/knowledge/retrieval/knowledge-retriever.types').KnowledgeDomain[]
	dataAvailable: boolean
}

export interface IntelligencePipelineStage<TInput, TOutput> {
	readonly name: string
	run(input: TInput): TOutput
}

export type PipelineRunInput = IntelligenceQueryInput
