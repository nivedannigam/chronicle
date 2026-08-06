import type {
	InsuranceClaimRecord,
	InsuranceCoverageRecord,
	InsuranceDocumentRecord,
	InsuranceInsurerRecord,
	InsuranceMemberRecord,
	InsuranceNomineeRecord,
	InsurancePolicyRecord,
	InsurancePolicyType,
	InsurancePremiumRecord,
	InsuranceRenewalRecord,
	InsuranceBenefitRecord,
	InsuranceExclusionRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'

export type PolicyCategoryId =
	'health' | 'life_term' | 'motor' | 'home' | 'travel'

export type InsuranceAlertSeverity = 'info' | 'attention' | 'critical'

export type InsuranceRelationshipType =
	| 'covers'
	| 'issued_by'
	| 'contains'
	| 'has'
	| 'belongs_to'
	| 'names'
	| 'evidenced_by'

export interface PolicyCategory {
	id: PolicyCategoryId
	name: string
	emoji: string
	color: string
	policyTypes: InsurancePolicyType[]
}

export interface PolicyRelationship {
	id: string
	fromEntityId: string
	fromEntityType: string
	toEntityId: string
	toEntityType: string
	relationshipType: InsuranceRelationshipType
	label: string
}

export interface PolicyHistory {
	policyId: string
	policyNumber: string
	policyType: InsurancePolicyType
	productName: string | null
	insurerId: string
	status: InsurancePolicyRecord['status']
	sumInsured: number | null
	currency: string
	inceptionDate: string | null
	expiryDate: string | null
	renewalDate: string | null
	premiums: InsurancePremiumRecord[]
	renewals: InsuranceRenewalRecord[]
	claims: InsuranceClaimRecord[]
	coverages: InsuranceCoverageRecord[]
	members: InsuranceMemberRecord[]
	nominees: InsuranceNomineeRecord[]
	sourceDocumentIds: string[]
	confidence: number
}

export interface CategorySnapshot {
	categoryId: PolicyCategoryId
	name: string
	emoji: string
	color: string
	policyCount: number
	activePolicyCount: number
	totalSumInsured: number | null
	currency: string
	latestRenewalDate: string | null
	statusLabel: string
	lastUpdated: string
}

export interface DerivedInsuranceInsight {
	id: string
	text: string
	tone: 'positive' | 'warning' | 'neutral'
	policyId?: string
}

export interface InsuranceAlert {
	id: string
	policyId: string
	severity: InsuranceAlertSeverity
	message: string
	observedAt: string
}

export interface CoverageGap {
	id: string
	categoryId: PolicyCategoryId
	categoryName: string
	severity: 'info' | 'warning' | 'critical'
	message: string
	recommendation: string
}

export interface PersonInsuranceProfile {
	personId: string
	policyHistories: PolicyHistory[]
	categories: CategorySnapshot[]
	insights: DerivedInsuranceInsight[]
	alerts: InsuranceAlert[]
	coverageGaps: CoverageGap[]
	relationships: PolicyRelationship[]
	documentIds: string[]
	policyIds: string[]
	generatedAt: string
	cacheVersion: string
}

export interface InsuranceKnowledgeGraph {
	profile: PersonInsuranceProfile
	policyCategories: PolicyCategory[]
	insurers: InsuranceInsurerRecord[]
}

export interface BuildInsuranceKnowledgeInput {
	personId: string
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

export interface InsuranceCoverageSnapshot {
	discoveredCount: number
	displayReadyCount: number
	activePolicyCount: number
	expiringCount: number
	lapsedCount: number
	failedCount: number
	processingCount: number
	corpusCompleteness: 'empty' | 'partial' | 'complete'
	policiesNeedingReprocess: string[]
}
