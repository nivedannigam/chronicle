export const FINANCE_DOCUMENT_TYPES = [
	'bank-statement',
	'credit-card-statement',
	'loan-statement',
	'investment-statement',
	'tax-record',
	'nps-statement',
	'epf-statement',
	'ppf-statement',
	'fd-statement',
	'salary-slip',
	'insurance-financial',
	'other',
] as const

export type FinanceDocumentType = (typeof FINANCE_DOCUMENT_TYPES)[number]

export type FinanceClassificationConfidence = 'high' | 'medium' | 'low'

export type FinanceClassificationSource =
	| 'metadata'
	| 'folder+filename'
	| 'folder'
	| 'filename'
	| 'mime'
	| 'existing'
	| 'content'

export interface FinanceDocumentClassification {
	type: FinanceDocumentType
	confidence: FinanceClassificationConfidence
	source: FinanceClassificationSource
}

export interface FinanceClassificationMetadata {
	financeClassification: FinanceDocumentClassification
	financeDisplayLabel: string
	classifiedAt: string
}
