import type { EvidenceReference } from '@/shared/ai/types/structured-response.types'

export type CompanionConfidenceLevel = 'high' | 'medium' | 'low'

/** Seven-part companion response layout — every domain client should map to this. */
export interface CompanionResponseSections {
	directAnswer: string
	evidenceFromReports: string[]
	whatChanged: string[]
	whatItMayMean: string[]
	doctorDiscussion: string[]
	confidenceLevel: CompanionConfidenceLevel
	sourceReports: EvidenceReference[]
}

export interface ConversationMemoryContext {
	previousQuestions: string[]
	previousTopics: string[]
	continuityHints: string[]
	lastMetricDiscussed?: string
	lastIntent?: string
}
