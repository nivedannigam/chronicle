import type {
	AIProviderId,
	IntentId,
	KnowledgeDomainId,
} from '@/shared/ai/types/ai-platform.types'

export interface AIObservabilityRecord {
	requestId: string
	timestamp: string
	provider: AIProviderId
	model: string
	intent: IntentId
	knowledgeProvider: string
	knowledgeDomain: KnowledgeDomainId
	promptTokens: number
	completionTokens: number
	totalTokens: number
	estimatedCostUsd: number
	latencyMs: number
	confidence: number
	cacheHit: boolean
	validationSuccess?: boolean
	retryCount?: number
	classifiedIntent?: string
	selectedTool?: string
	toolExecutionTimeMs?: number
	evidenceCount?: number
	excludedEvidence?: string[]
	estimatedContextTokens?: number
	error?: string
}

export type AIObservabilitySink = (record: AIObservabilityRecord) => void
