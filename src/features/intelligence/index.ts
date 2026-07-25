export {
	bootstrapIntelligenceProviders,
	resolveIntelligenceMember,
	runIntelligencePipeline,
} from '@/features/intelligence/pipeline/chronicle-intelligence.pipeline'
export {
	registerKnowledgeProvider,
	getKnowledgeProvider,
	getRegisteredProviders,
	getAvailableProviders,
} from '@/features/intelligence/registry/intelligence-registry'
export { healthKnowledgeProvider } from '@/features/intelligence/providers/health-knowledge.provider'
export { documentsKnowledgeProvider } from '@/features/intelligence/providers/documents-knowledge.provider'
export { generateFollowUpQuestions } from '@/features/intelligence/services/follow-up-generator.service'
export {
	computeGroundedConfidence,
	confidenceLevelLabel,
	parseConfidenceLevel,
	toConfidenceLevel,
} from '@/features/intelligence/types/confidence.types'
export type { ConfidenceLevel } from '@/features/intelligence/types/confidence.types'
export {
	rankSearchHits,
	topReportIdsFromHits,
} from '@/features/intelligence/services/search-ranking.service'
export {
	extractTextSnippet,
	mergeSearchHits,
	scoreTextMatch,
	tokenizeQuery,
} from '@/features/intelligence/services/semantic-search.service'
export {
	buildMemorySessionKey,
	resolveMemberFromQuestion,
} from '@/features/intelligence/services/member-context.service'
export type {
	ChronicleKnowledgeProvider,
	IntelligenceMemberContext,
	IntelligencePipelineContext,
	IntelligenceQueryInput,
	KnowledgeProviderContext,
	KnowledgeProviderResult,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'
export { createEmptyKnowledge } from '@/features/intelligence/types/intelligence.types'
