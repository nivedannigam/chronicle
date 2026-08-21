import type { FinanceDocumentType } from '@/features/finance-knowledge/types/finance-classification.types'
import type {
	FinanceFactConfidence,
	FinanceOwnership,
} from '@/features/finance-knowledge/types/finance-knowledge.types'

export type FinanceExtractionStatus =
	'pending' | 'complete' | 'incomplete' | 'failed' | 'unsupported'

export type FinanceEntityKind =
	'bank_account' | 'credit_card' | 'loan' | 'investment_account'

export const FINANCE_EXTRACTABLE_TYPES = [
	'bank-statement',
	'credit-card-statement',
	'loan-statement',
	'investment-statement',
] as const

export type FinanceExtractableDocumentType =
	(typeof FINANCE_EXTRACTABLE_TYPES)[number]

export interface FinancialFactRecord {
	id: string
	entityId: string
	factType: string
	value: string
	unit: string | null
	currency: string | null
	asOfDate: string | null
	sourceDocumentId: string
	sourcePage: number | null
	confidence: FinanceFactConfidence
	extractionMethod: string
	verified: boolean
}

export interface FinanceDocumentExtractionPayload {
	status: FinanceExtractionStatus
	documentType: FinanceDocumentType
	entityKind: FinanceEntityKind | null
	entityId: string | null
	institutionName: string | null
	maskedIdentifier: string | null
	displayName: string | null
	accountType: string | null
	cardName: string | null
	loanType: string | null
	schemeName: string | null
	statementDate: string | null
	statementPeriodStart: string | null
	statementPeriodEnd: string | null
	facts: FinancialFactRecord[]
	ownership: FinanceOwnership
	accountHolder: string | null
	jointHolder: string | null
	extractionMethod: string | null
	extractedAt: string | null
	userMessage: string | null
}

export type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'
