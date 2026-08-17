/** Structured insurance data produced by AI extraction and persisted to DB. */

export type InsurancePolicyType =
	'health' | 'life_term' | 'motor' | 'home' | 'travel' | 'other'

export type InsurancePolicyStatus =
	'active' | 'lapsed' | 'expired' | 'cancelled' | 'unknown'

export type InsuranceDocumentKind =
	| 'policy_schedule'
	| 'renewal_notice'
	| 'endorsement'
	| 'claim_letter'
	| 'eob'
	| 'premium_receipt'
	| 'unknown'

export type InsuranceClaimStatus =
	'filed' | 'processing' | 'approved' | 'rejected' | 'paid' | 'closed'

export type InsuranceRenewalStatus = 'upcoming' | 'due' | 'paid' | 'missed'

export type InsurancePremiumFrequency =
	'annual' | 'semi_annual' | 'quarterly' | 'monthly' | 'single' | 'unknown'

export type InsuranceCoverageStatus = 'active' | 'excluded' | 'unknown'

export type InsuranceExtractionMethod =
	'deterministic' | 'llm' | 'layout+llm' | 'manual'

export interface InsuranceInsurerRecord {
	id: string
	canonicalName: string
	displayName: string
	country?: string | null
}

export interface InsurancePolicyRecord {
	id: string
	userId: string
	familyMemberId: string | null
	policyNumber: string
	policyType: InsurancePolicyType
	productName: string | null
	insurerId: string
	status: InsurancePolicyStatus
	inceptionDate: string | null
	expiryDate: string | null
	renewalDate: string | null
	sumInsured: number | null
	currency: string
	sourceDocumentIds: string[]
	extractionMethod: InsuranceExtractionMethod
	confidence: number
	createdAt: string
	updatedAt: string
}

export interface InsuranceCoverageRecord {
	id: string
	policyId: string
	canonicalCoverageId: string
	displayName: string
	sumInsured: number | null
	sublimit: number | null
	deductible: number | null
	copay: string | null
	waitingPeriodDays: number | null
	status: InsuranceCoverageStatus
}

export interface InsuranceMemberRecord {
	id: string
	policyId: string
	name: string
	relationship: string
	dateOfBirth: string | null
	familyMemberId: string | null
}

export interface InsuranceNomineeRecord {
	id: string
	policyId: string
	name: string
	relationship: string
	sharePercent: number | null
}

export interface InsurancePremiumRecord {
	id: string
	policyId: string
	amount: number
	currency: string
	frequency: InsurancePremiumFrequency
	dueDate: string | null
	paidDate: string | null
	sourceDocumentId: string | null
}

export interface InsuranceRenewalRecord {
	id: string
	policyId: string
	renewalDate: string
	previousPremium: number | null
	newPremium: number | null
	status: InsuranceRenewalStatus
	sourceDocumentId: string | null
}

export interface InsuranceClaimRecord {
	id: string
	policyId: string
	claimNumber: string
	claimType: string | null
	filedDate: string | null
	settledDate: string | null
	claimedAmount: number | null
	approvedAmount: number | null
	status: InsuranceClaimStatus
	providerName: string | null
}

export interface InsuranceBenefitRecord {
	id: string
	policyId: string
	description: string
}

export interface InsuranceExclusionRecord {
	id: string
	policyId: string
	description: string
}

export interface InsuranceDocumentRecord {
	id: string
	userId: string
	familyMemberId: string | null
	registryId: string | null
	fileName: string
	storagePath: string
	documentKind: InsuranceDocumentKind
	status: string
	linkedPolicyIds: string[]
	parsedData: Record<string, unknown> | null
	uploadedAt: string
	processedAt: string | null
}

/** Raw corpus fetched before member filtering and graph assembly. */
export interface InsuranceKnowledgeRawRecords {
	policies: InsurancePolicyRecord[]
	coverages: InsuranceCoverageRecord[]
	members: InsuranceMemberRecord[]
	nominees: InsuranceNomineeRecord[]
	premiums: InsurancePremiumRecord[]
	renewals: InsuranceRenewalRecord[]
	claims: InsuranceClaimRecord[]
	benefits: InsuranceBenefitRecord[]
	exclusions: InsuranceExclusionRecord[]
	documents: InsuranceDocumentRecord[]
	insurers: InsuranceInsurerRecord[]
}
