import type { KnowledgeEvidenceItem } from '@/shared/ai/types/knowledge.types'
import type { CompanionConfidenceLevel } from '@/shared/ai/types/companion-response.types'

export type OverallHealthStatus =
	'stable' | 'needs_attention' | 'critical' | 'insufficient_data'

export interface EvidenceReference {
	id: string
	label: string
	sourceType: string
}

export interface StructuredAIResponse {
	/** Legacy executive summary — same as directAnswer when normalized. */
	summary: string
	overallStatus: OverallHealthStatus
	keyFindings: string[]
	recommendations: string[]
	followUpQuestions: string[]
	confidence: number
	limitations: string[]
	evidenceReferences: EvidenceReference[]
	/** Seven-part companion layout (Phase 5). */
	directAnswer?: string
	evidenceFromReports?: string[]
	whatChanged?: string[]
	whatItMayMean?: string[]
	doctorDiscussion?: string[]
	confidenceLevel?: CompanionConfidenceLevel
	sourceReports?: EvidenceReference[]
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
