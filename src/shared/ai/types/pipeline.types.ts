import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type {
	HealthToolPayload,
	ToolResult,
} from '@/shared/ai/tools/tool.types'
import type {
	IntentId,
	KnowledgeDomainId,
} from '@/shared/ai/types/ai-platform.types'
import type { NormalizedKnowledge } from '@/shared/ai/types/knowledge.types'
import type { StructuredAIResponse } from '@/shared/ai/types/structured-response.types'
import type { AIObservabilityRecord } from '@/shared/ai/observability/ai-observability.types'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'

export interface AIPlatformRequest {
	requestId?: string
	question: string
	/** Legacy intent id — classification derives ChronicleIntent from question. */
	intent?: IntentId
	domain: KnowledgeDomainId
	userId?: string
	memberName?: string | null
	knowledgePayload: Record<string, unknown>
	healthKnowledge?: HealthKnowledge
}

export interface AIPlatformResult {
	requestId: string
	intent: IntentId
	domain: KnowledgeDomainId
	classifiedIntent: ClassifiedIntent
	selectedEvidence: SelectedEvidence
	selectedTool: string
	toolResult: ToolResult<HealthToolPayload>
	knowledge: NormalizedKnowledge
	response: StructuredAIResponse
	observability: AIObservabilityRecord
	healthKnowledge?: HealthKnowledge
}
