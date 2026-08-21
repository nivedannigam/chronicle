import type {
	FinanceFactConfidence,
	FinanceOwnership,
} from '@/features/finance-knowledge/types/finance-knowledge.types'

export type FinanceEntityResolutionState =
	'matched' | 'new' | 'ambiguous' | 'unresolved'

export interface FinanceObservation {
	id: string
	entityId: string
	factType: string
	value: string
	unit: string | null
	currency: string | null
	asOfDate: string | null
	sourceDocumentId: string
	sourceDocumentIds: string[]
	sourcePage: number | null
	confidence: FinanceFactConfidence
	extractionMethod: string
	verified: boolean
	isConflicting: boolean
	conflictGroupId: string | null
}

export interface FinanceCurrentFact {
	entityId: string
	factType: string
	value: string | null
	asOfDate: string | null
	previousValue: string | null
	previousAsOfDate: string | null
	changeFromPrevious: string | null
	sourceDocumentId: string | null
	confidence: FinanceFactConfidence | null
	hasConflict: boolean
	conflictingSourceDocumentIds: string[]
}

export interface FinanceCoverageMeta {
	level: 'not_setup' | 'organizing' | 'partial' | 'documented'
	entityCount: number
	documentCount: number
	extractedDocumentCount: number
	incompleteDocumentCount: number
	ambiguousEntityCount: number
	conflictingObservationCount: number
}

export interface FinanceEntityMatchCandidate {
	entityId: string
	dedupeKey: string | null
	kind: string
	institutionName: string | null
	maskedIdentifier: string | null
	metadataLabel: string | null
}

export interface FinanceEntityResolutionResult {
	entityId: string
	resolutionState: FinanceEntityResolutionState
	dedupeKey: string | null
	ownership: FinanceOwnership
}
