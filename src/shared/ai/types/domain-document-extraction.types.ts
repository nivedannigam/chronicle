import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

export type DomainDocumentExtractionTarget = 'insurance' | 'vehicles'

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

export interface DomainDocumentExtractionResult {
	target: DomainDocumentExtractionTarget
	method: 'llm' | 'metadata_fallback'
	extractedText: string | null
	insurance?: InsuranceDocumentExtraction
	vehicle?: VehicleDocumentAiExtraction
}
