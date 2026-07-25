import type { ConfidenceLevel } from '@/features/intelligence/types/confidence.types'
import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'

/** How a statement relates to Chronicle data. */
export type ClaimKind = 'known_fact' | 'inference' | 'unavailable'

export interface TrustEvidenceItem {
	id: string
	reportId: string
	reportTitle: string
	reportDate: string
	hospital?: string
	metricName?: string
	metricId?: string
	metricValue?: string
	ocrExcerpt?: string
	section?: string
	claimKind: ClaimKind
	source: KnowledgeDomain
}

export interface ReportDisagreement {
	id: string
	metricName: string
	metricId: string
	values: Array<{
		reportId: string
		reportTitle: string
		date: string
		value: string
		status?: string
	}>
	explanation: string
}

export interface TrustConfidence {
	level: ConfidenceLevel
	score: number
	factors: string[]
}

/** Standardized explainable response envelope for every Ask turn. */
export interface TrustResponse {
	directAnswer: string
	evidence: string[]
	supportingReports: Array<{ id: string; title: string; date: string }>
	timelineSummary: string[]
	confidence: TrustConfidence
	missingInformation: string[]
	disagreements: ReportDisagreement[]
	followUpQuestions: string[]
	evidenceItems: TrustEvidenceItem[]
	explainabilityPrompts: string[]
}

export const EXPLAINABILITY_PROMPTS = [
	'Why did you say this?',
	'What evidence supports this?',
	'Which reports contributed?',
	'What information is missing?',
] as const

export const TRUST_SAFETY_FOOTER =
	'This is informational and not medical advice. Consult a healthcare professional for medical decisions.'
