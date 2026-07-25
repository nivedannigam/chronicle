export {
	runIntelligencePipeline,
	resolveIntelligenceMember,
} from '@/features/intelligence/pipeline/chronicle-intelligence.pipeline'
export { runKnowledgeOrchestrator } from '@/features/intelligence/orchestrator/knowledge-orchestrator'
export {
	contextBuilder,
	ContextBuilder,
} from '@/features/intelligence/context/context-builder'
export type { BuiltKnowledgeContext } from '@/features/intelligence/context/context-builder'
export {
	registerKnowledgeProvider,
	unregisterKnowledgeProvider,
	clearKnowledgeProviders,
	getKnowledgeProvider,
	getRegisteredProviders,
	getSupportingProviders,
	getRegisteredProviderCount,
	getRegisteredProviderIds,
} from '@/features/intelligence/registry/intelligence-registry'
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
export {
	toRetrievedKnowledge,
	fromRetrievedKnowledge,
} from '@/features/intelligence/adapters/retrieved-knowledge.adapter'
export type {
	KnowledgePerson,
	KnowledgeDocument,
	KnowledgeMetric,
	KnowledgeObservation,
	KnowledgeTimelineEvent,
	KnowledgeFinding,
	KnowledgeReference,
	KnowledgeComparison,
	KnowledgeContextPackage,
} from '@/features/intelligence/entities/knowledge-entities'
export {
	createEmptyContextPackage,
	isContextPackageEmpty,
} from '@/features/intelligence/entities/knowledge-entities'
export type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderQuery,
	ProviderContextResult,
} from '@/features/intelligence/contracts/knowledge-provider.contract'
export type {
	IntelligenceMemberContext,
	IntelligenceQueryInput,
	IntelligencePipelineContext,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'
export { buildIntelligenceSources } from '@/features/intelligence/types/intelligence.types'
