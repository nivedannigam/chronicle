import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type {
	InsuranceClaimStatus,
	InsuranceDocumentKind,
	InsuranceExtractionMethod,
	InsurancePolicyStatus,
	InsurancePolicyType,
	InsurancePremiumFrequency,
	InsuranceRenewalStatus,
} from '@/features/insurance-knowledge/types/insurance-record.types'

export type InsuranceKnowledgeLimitationCode =
	| 'no_policies'
	| 'single_policy'
	| 'policy_expired'
	| 'renewal_within_30d'
	| 'incomplete_coverage_table'
	| 'missing_nominee'
	| 'missing_sum_insured'
	| 'unlinked_claim'
	| 'import_failures'
	| 'partial_extraction'
	| 'reprocess_needed'
	| 'processing_in_progress'
	| 'incomplete_corpus'
	| 'low_extraction_confidence'

export type InsuranceTimelineEventType =
	| 'policy_purchased'
	| 'policy_renewed'
	| 'premium_paid'
	| 'claim_filed'
	| 'claim_settled'
	| 'policy_expired'
	| 'policy_closed'
	| 'document_imported'
	| 'endorsement'

export type InsuranceKnowledgePriority = 'critical' | 'high' | 'medium' | 'low'

export interface InsuranceKnowledgeHolder {
	userId: string
}

export interface InsuranceKnowledgeFamilyMember {
	id: string | null
	displayName: string
	relationship: string
	isAccountOwner: boolean
	dateOfBirth: string | null
}

export interface InsuranceKnowledgeInsurer {
	id: string
	canonicalName: string
	displayName: string
	country: string | null
}

export interface InsuranceKnowledgePolicy {
	id: string
	policyNumber: string
	policyType: InsurancePolicyType
	categoryId: PolicyCategoryId
	productName: string | null
	insurerId: string
	insurerName: string
	status: InsurancePolicyStatus
	inceptionDate: string | null
	expiryDate: string | null
	renewalDate: string | null
	sumInsured: number | null
	currency: string
	isDisplayReady: boolean
	needsReprocess: boolean
	daysUntilExpiry: number | null
	isExpiringSoon: boolean
	extractionMethod: InsuranceExtractionMethod
	confidence: number
	priority: InsuranceKnowledgePriority
	rankingReason: string
	sourceDocumentIds: string[]
}

export interface InsuranceKnowledgeCoverage {
	id: string
	policyId: string
	canonicalCoverageId: string
	displayName: string
	sumInsured: number | null
	sublimit: number | null
	deductible: number | null
	copay: string | null
	waitingPeriodDays: number | null
	status: string
}

export interface InsuranceKnowledgeMember {
	id: string
	policyId: string
	name: string
	relationship: string
	dateOfBirth: string | null
	familyMemberId: string | null
}

export interface InsuranceKnowledgeNominee {
	id: string
	policyId: string
	name: string
	relationship: string
	sharePercent: number | null
}

export interface InsuranceKnowledgePremium {
	id: string
	policyId: string
	amount: number
	currency: string
	frequency: InsurancePremiumFrequency
	dueDate: string | null
	paidDate: string | null
}

export interface InsuranceKnowledgeRenewal {
	id: string
	policyId: string
	renewalDate: string
	previousPremium: number | null
	newPremium: number | null
	status: InsuranceRenewalStatus
}

export interface InsuranceKnowledgeClaim {
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
	priority: InsuranceKnowledgePriority
}

export interface InsuranceKnowledgeBenefit {
	id: string
	policyId: string
	description: string
}

export interface InsuranceKnowledgeExclusion {
	id: string
	policyId: string
	description: string
}

export interface InsuranceKnowledgeDocumentRef {
	id: string
	fileName: string
	documentKind: InsuranceDocumentKind
	status: string
	linkedPolicyIds: string[]
	uploadedAt: string
	isDisplayReady: boolean
}

export interface InsuranceKnowledgeRelationship {
	id: string
	fromEntityId: string
	fromEntityType: string
	toEntityId: string
	toEntityType: string
	relationshipType: string
	label: string
}

export interface InsuranceKnowledgeCoverageGap {
	id: string
	categoryId: PolicyCategoryId
	categoryName: string
	severity: 'info' | 'warning' | 'critical'
	message: string
	recommendation: string
	evidenceIds: string[]
}

export interface InsuranceKnowledgeCategorySnapshot {
	categoryId: PolicyCategoryId
	name: string
	emoji: string
	color: string
	policyCount: number
	activePolicyCount: number
	totalSumInsured: number | null
	currency: string
	statusLabel: string
	lastUpdated: string
}

export interface InsuranceKnowledgeTimelineEvent {
	id: string
	type: InsuranceTimelineEventType
	title: string
	description: string
	date: string
	evidenceIds: string[]
	policyId?: string
	claimId?: string
	documentId?: string
}

export interface InsuranceKnowledgeLimitation {
	code: InsuranceKnowledgeLimitationCode
	message: string
	severity: 'info' | 'warning' | 'error'
}

export interface InsuranceKnowledgeInsight {
	id: string
	text: string
	tone: 'positive' | 'warning' | 'neutral'
	policyId?: string
	evidenceIds: string[]
}

export interface InsuranceKnowledgeRecommendation {
	id: string
	text: string
	priority: 'high' | 'medium' | 'low'
	evidenceIds: string[]
}

export interface InsuranceKnowledgeConfidence {
	overall: number
	dataCompleteness: number
	extractionConfidence: number | null
	policyCoverage: number
	policyCount: number
	displayReadyCount: number
}

export interface InsuranceKnowledgeSource {
	type:
		| 'insurance_policy'
		| 'insurance_document'
		| 'insurance_claim'
		| 'insurance_coverage'
		| 'workflow'
		| 'coverage'
	id: string
	label: string
	date?: string
}

export interface InsuranceKnowledgeSummary {
	headline: string
	lines: string[]
	policyCount: number
	activePolicyCount: number
	expiringCount: number
	claimCount: number
	totalSumInsured: number | null
	currency: string
}

/** Canonical insurance knowledge object — single source of truth for the Insurance module. */
export interface InsuranceKnowledge {
	holder: InsuranceKnowledgeHolder
	familyMember: InsuranceKnowledgeFamilyMember
	policies: InsuranceKnowledgePolicy[]
	activePolicies: InsuranceKnowledgePolicy[]
	expiringPolicies: InsuranceKnowledgePolicy[]
	lapsedPolicies: InsuranceKnowledgePolicy[]
	coverages: InsuranceKnowledgeCoverage[]
	claims: InsuranceKnowledgeClaim[]
	members: InsuranceKnowledgeMember[]
	nominees: InsuranceKnowledgeNominee[]
	insurers: InsuranceKnowledgeInsurer[]
	premiums: InsuranceKnowledgePremium[]
	renewals: InsuranceKnowledgeRenewal[]
	benefits: InsuranceKnowledgeBenefit[]
	exclusions: InsuranceKnowledgeExclusion[]
	documents: InsuranceKnowledgeDocumentRef[]
	relationships: InsuranceKnowledgeRelationship[]
	coverageGaps: InsuranceKnowledgeCoverageGap[]
	coverageByCategory: InsuranceKnowledgeCategorySnapshot[]
	protectionScore: number | null
	timeline: InsuranceKnowledgeTimelineEvent[]
	insights: InsuranceKnowledgeInsight[]
	recommendations: InsuranceKnowledgeRecommendation[]
	confidence: InsuranceKnowledgeConfidence
	limitations: InsuranceKnowledgeLimitation[]
	sources: InsuranceKnowledgeSource[]
	summary: InsuranceKnowledgeSummary
	generatedAt: string
	buildDurationMs: number
}

export interface InsuranceKnowledgeGetInput {
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}
