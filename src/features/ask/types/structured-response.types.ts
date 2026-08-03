import type { ConfidenceLevel } from '@/features/intelligence/types/confidence.types'

/** Human-first response layout for every Ask turn. */
export interface StructuredAskResponse {
	directAnswer: string
	evidenceFromReports?: string[]
	whatChanged?: string[]
	whatItMayMean?: string[]
	doctorDiscussion?: string[]
	sourceReports?: Array<{ id: string; label: string }>
	keyFindings: string[]
	explanation: string | null
	recommendations: string[]
	limitations: string[]
	hasEvidence: boolean
	relatedQuestions: string[]
	confidenceLevel: ConfidenceLevel
	uncertaintyNote: string | null
	showSafetyFooter: boolean
}

/** Future voice session envelope — architecture only, not implemented. */
export interface AskVoiceSessionConfig {
	enabled: false
	locale: string
	wakePhrase?: string
}

export interface AskVoiceTurn {
	sessionId: string
	transcript: string
	responseText: string
	timestamp: string
}
