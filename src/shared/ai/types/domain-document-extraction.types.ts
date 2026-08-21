import type { FinanceExtractableDocumentType } from '@/features/finance-knowledge/types/finance-extraction.types'
import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'
import type {
	DocumentExtractionMethod,
	DocumentExtractionObservability,
} from '@/shared/ai/types/document-extraction.types'

export type DomainDocumentExtractionTarget =
	'insurance' | 'vehicles' | 'finance'

export interface InsuranceDocumentExtraction {
	insurer: string | null
	policyNumber: string | null
	policyType: InsurancePolicyType | null
	productName: string | null
	inceptionDate: string | null
	expiryDate: string | null
	renewalDate: string | null
	sumInsured: number | null
	premium: number | null
	currency: string | null
	insuredMembers: string[]
	documentKind: string | null
	confidence: number
	rawFields: Record<string, string | number | null>
}

export interface VehicleDocumentAiExtraction {
	documentType: VehicleDocumentTypeId | null
	documentSubtype: string | null
	registrationNumber: string | null
	vin: string | null
	engineNumber: string | null
	make: string | null
	model: string | null
	variant: string | null
	documentDate: string | null
	expiryDate: string | null
	provider: string | null
	facts: Array<{
		factKey: string
		factValue: string | null
		valueDate?: string | null
		valueNumber?: number | null
	}>
	confidence: number
	rawFields: Record<string, string | number | null>
}

export interface FinanceDocumentAiExtraction {
	documentType: FinanceExtractableDocumentType
	institution: string | null
	accountType: string | null
	cardName: string | null
	loanType: string | null
	investmentType: string | null
	maskedAccountIdentifier: string | null
	accountHolder: string | null
	jointHolder: string | null
	statementDate: string | null
	statementPeriodStart: string | null
	statementPeriodEnd: string | null
	currency: string | null
	openingBalance: number | null
	closingBalance: number | null
	totalAmountDue: number | null
	minimumAmountDue: number | null
	paymentDueDate: string | null
	creditLimit: number | null
	availableCredit: number | null
	outstandingPrincipal: number | null
	originalLoanAmount: number | null
	interestRate: number | null
	emi: number | null
	nextPaymentDate: string | null
	loanStartDate: string | null
	loanEndDate: string | null
	folioNumber: string | null
	schemeName: string | null
	units: number | null
	nav: number | null
	marketValue: number | null
	investedValue: number | null
	confidence: number
	rawFields: Record<string, string | number | null>
}

export interface DomainDocumentExtractionResult {
	target: DomainDocumentExtractionTarget
	method: DocumentExtractionMethod
	extractedText: string | null
	insurance?: InsuranceDocumentExtraction
	vehicle?: VehicleDocumentAiExtraction
	finance?: FinanceDocumentAiExtraction
	observability?: DocumentExtractionObservability
}
