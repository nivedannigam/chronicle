export {
	tokenizeQuery,
	scoreTextMatch,
	extractTextSnippet,
	mergeSearchHits,
} from './services/semantic-search.service.ts'
export {
	rankSearchHits,
	topReportIdsFromHits,
} from './services/search-ranking.service.ts'
export type { SearchRankingContext } from './services/search-ranking.service.ts'
export {
	registerKnowledgeProvider,
	unregisterKnowledgeProvider,
	clearKnowledgeProviders,
	getKnowledgeProvider,
	getRegisteredProviders,
	getSupportingProviders,
	getAvailableProviders,
	getRegisteredProviderCount,
	getRegisteredProviderIds,
} from './registry/knowledge-provider-registry.ts'
export { mergeProviderPackages } from './orchestrator/context-merger.ts'
export type { MergeContextResult } from './orchestrator/context-merger.ts'
export {
	runKnowledgeOrchestrator,
	buildIntelligenceSources,
} from './orchestrator/knowledge-orchestrator.ts'
export type {
	IntelligenceQueryInput,
	OrchestratorInput,
	OrchestratorResult,
} from './orchestrator/knowledge-orchestrator.ts'
export { contextBuilder, ContextBuilder } from './context/context-builder.ts'
export type {
	ContextBuilderInput,
	BuiltKnowledgeContext,
} from './context/context-builder.ts'
