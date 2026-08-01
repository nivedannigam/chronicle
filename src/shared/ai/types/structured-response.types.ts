import type { KnowledgeEvidenceItem } from '@/shared/ai/types/knowledge.types'

export type OverallHealthStatus =
	'stable' | 'needs_attention' | 'critical' | 'insufficient_data'

export interface EvidenceReference {
	id: string
	label: string
	sourceType: string
}

export interface StructuredAIResponse {
	summary: string
	overallStatus: OverallHealthStatus
	keyFindings: string[]
	recommendations: string[]
	followUpQuestions: string[]
	confidence: number
	limitations: string[]
	evidenceReferences: EvidenceReference[]
	/** @deprecated Use evidenceReferences */
	evidence?: KnowledgeEvidenceItem[]
}

export interface StructuredResponseValidationResult {
	ok: true
	value: StructuredAIResponse
}

export interface StructuredResponseValidationError {
	ok: false
	errors: string[]
	raw: unknown
}

export type ValidateStructuredResponseResult =
	StructuredResponseValidationResult | StructuredResponseValidationError

export interface GroundedValidationContext {
	allowedMetricNames: Set<string>
	allowedReportIds: Set<string>
	allowedEvidenceIds: Set<string>
}

export interface GroundedValidationResult {
	ok: boolean
	errors: string[]
	value?: StructuredAIResponse
}
