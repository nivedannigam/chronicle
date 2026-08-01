export {
	loadAIPlatformConfig,
	defaultAIPlatformConfig,
	isAIPlatformConfigured,
} from '@/shared/ai/config/ai-platform.config'

export { AIGateway, defaultAIGateway } from '@/shared/ai/gateway/ai-gateway'

export { MockProvider } from '@/shared/ai/providers/mock.provider'
export {
	GeminiProvider,
	GeminiProviderError,
} from '@/shared/ai/providers/gemini.provider'
export {
	OpenAIProvider,
	ClaudeProvider,
} from '@/shared/ai/providers/stub.providers'
export { createAIProvider } from '@/shared/ai/providers/provider.factory'

export { buildPlatformPrompt } from '@/shared/ai/prompt/prompt-builder'
export { buildHealthSummarizePrompt } from '@/shared/ai/prompt/health-summarize.prompt'
export { buildEvidencePrompt } from '@/shared/ai/prompt/evidence-prompt.builder'
export {
	CHRONICLE_HEALTH_SYSTEM_PROMPT,
	CHRONICLE_SYSTEM_PROMPT,
	CHRONICLE_DEVELOPER_PROMPT,
	STRUCTURED_OUTPUT_SCHEMA_DESCRIPTION,
} from '@/shared/ai/prompt/prompt-templates'

export {
	structuredAIResponseSchema,
	validateStructuredResponse,
	validateStructuredResponseContent,
	assertStructuredResponse,
	parseStructuredResponseContent,
	validateGroundedResponse,
	buildGroundedValidationContext,
} from '@/shared/ai/response/response-validator'

export {
	recordAICost,
	getAICostLog,
	clearAICostLog,
	getTotalEstimatedCost,
} from '@/shared/ai/cost/cost-tracker'
export { estimateTokenCost } from '@/shared/ai/cost/cost-pricing'

export {
	ToolExecutor,
	defaultToolExecutor,
} from '@/shared/ai/tools/tool-executor'
export {
	ToolRegistry,
	defaultToolRegistry,
} from '@/shared/ai/tools/tool-registry'
export {
	selectToolForIntent,
	listToolsForIntent,
} from '@/shared/ai/tools/tool-selector'
export { toolResultToEvidence } from '@/shared/ai/tools/tool-result-to-evidence'
export {
	recordToolExecution,
	getToolExecutionLog,
	clearToolExecutionLog,
} from '@/shared/ai/tools/tool-observability'
export {
	createToolContext,
	resolveToolRole,
	assertToolPermission,
} from '@/shared/ai/tools/tool-permissions'
export { registerHealthTools } from '@/shared/ai/tools/health/register-health-tools'
export {
	ToolError,
	type ChronicleTool,
	type ToolContext,
	type ToolResult,
	type ToolSelection,
	type ToolSchema,
	type HealthToolPayload,
} from '@/shared/ai/tools/tool.types'
export type { ToolPermissionLevel } from '@/shared/ai/tools/tool-permissions'
export type { ToolExecutionRecord } from '@/shared/ai/tools/tool-observability'

export {
	isProductionAiIntent,
	isProductionAiQuestion,
	classifyQuestionIntent,
	mapErrorToUserMessage,
} from '@/shared/ai/errors/ai-errors'

export {
	healthIntentClassifier,
	HealthIntentClassifier,
} from '@/shared/ai/intent/health-intent-classifier'
export {
	healthEvidenceSelector,
	HealthEvidenceSelector,
} from '@/shared/ai/evidence/health-evidence-selector'
export { classifyAndSelectHealthEvidence } from '@/shared/ai/intent-evidence/intent-evidence.orchestrator'
export {
	registerDomainIntentEvidence,
	getDomainIntentEvidence,
	listRegisteredIntentDomains,
} from '@/shared/ai/intent/intent-registry'
export {
	recordEvidenceSelection,
	getEvidenceSelectionLog,
	clearEvidenceSelectionLog,
} from '@/shared/ai/observability/evidence-observability'
export type {
	ChronicleIntent,
	ClassifiedIntent,
	IntentClassifier,
} from '@/shared/ai/intent/intent.types'
export type {
	SelectedEvidence,
	EvidenceItem,
	EvidenceSelector,
} from '@/shared/ai/evidence/evidence.types'

export {
	KnowledgeProviderRegistry,
	defaultKnowledgeProviderRegistry,
} from '@/shared/ai/knowledge/knowledge-provider.registry'
export {
	createDefaultKnowledgeRegistry,
	registerDefaultKnowledgeProviders,
} from '@/shared/ai/knowledge/knowledge-bootstrap'
export { HealthKnowledgePlatformAdapter } from '@/shared/ai/knowledge/health-knowledge.provider'
export {
	HealthKnowledgeProvider,
	healthKnowledgeProvider,
	healthKnowledgeToPayload,
} from '@/features/health-knowledge/providers/health-knowledge.provider'

export {
	recordAIObservability,
	registerAIObservabilitySink,
	getAIObservabilityLog,
	clearAIObservabilityLog,
} from '@/shared/ai/observability/ai-observability'

export {
	AIPlatformPipeline,
	createDefaultAIPlatformPipeline,
	defaultAIPlatformPipeline,
} from '@/shared/ai/pipeline/ai-platform.pipeline'

export type {
	AIProvider,
	AIProviderId,
	AIGenerateRequest,
	AIGenerateResponse,
	AIPlatformConfig,
	AIMessage,
	KnowledgeDomainId,
	IntentId,
} from '@/shared/ai/types/ai-platform.types'

export type {
	KnowledgeProvider,
	NormalizedKnowledge,
	KnowledgeRetrievalInput,
	KnowledgeReport,
	KnowledgeMetric,
	KnowledgeEvidenceItem,
} from '@/shared/ai/types/knowledge.types'

export type {
	StructuredAIResponse,
	ValidateStructuredResponseResult,
} from '@/shared/ai/types/structured-response.types'

export type { BuiltPrompt, PromptContext } from '@/shared/ai/types/prompt.types'

export type {
	AIPlatformRequest,
	AIPlatformResult,
} from '@/shared/ai/types/pipeline.types'

export type { AIObservabilityRecord } from '@/shared/ai/observability/ai-observability.types'
