import type {
	InsuranceKnowledgePolicy,
	InsuranceKnowledgePriority,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

const EXPIRING_SOON_DAYS = 30

const HIGH_PRIORITY_CATEGORIES = new Set<PolicyCategoryId>([
	'health',
	'life_term',
])

export interface RankablePolicyInput {
	id: string
	policyNumber: string
	policyType: InsuranceKnowledgePolicy['policyType']
	categoryId: PolicyCategoryId
	productName: string | null
	insurerId: string
	insurerName: string
	status: InsuranceKnowledgePolicy['status']
	inceptionDate: string | null
	expiryDate: string | null
	renewalDate: string | null
	sumInsured: number | null
	currency: string
	isDisplayReady: boolean
	needsReprocess: boolean
	daysUntilExpiry: number | null
	isExpiringSoon: boolean
	extractionMethod: InsuranceKnowledgePolicy['extractionMethod']
	confidence: number
	sourceDocumentIds: string[]
}

function computePriorityScore(policy: RankablePolicyInput): {
	score: number
	priority: InsuranceKnowledgePriority
	reason: string
} {
	if (policy.isExpiringSoon && policy.status === 'active') {
		return {
			score: 98,
			priority: 'critical',
			reason: 'Policy renews within 30 days.',
		}
	}

	if (policy.status === 'expired' || policy.status === 'lapsed') {
		return {
			score: 85,
			priority: 'critical',
			reason: 'Policy is no longer active.',
		}
	}

	if (policy.isExpiringSoon) {
		return {
			score: 90,
			priority: 'critical',
			reason: 'Policy renews within 30 days.',
		}
	}

	if (policy.needsReprocess) {
		return {
			score: 80,
			priority: 'high',
			reason: 'Policy needs reprocessing for complete extraction.',
		}
	}

	if (
		policy.status === 'active' &&
		HIGH_PRIORITY_CATEGORIES.has(policy.categoryId)
	) {
		return {
			score: 70,
			priority: 'high',
			reason: 'Core protection category.',
		}
	}

	if (policy.status === 'active') {
		return {
			score: 50,
			priority: 'medium',
			reason: 'Active policy.',
		}
	}

	if (policy.status === 'unknown') {
		return {
			score: 40,
			priority: 'medium',
			reason: 'Policy status is unknown.',
		}
	}

	return {
		score: 20,
		priority: 'low',
		reason: 'Inactive or cancelled policy.',
	}
}

export function rankInsurancePolicy(
	policy: RankablePolicyInput,
): InsuranceKnowledgePolicy {
	const ranking = computePriorityScore(policy)

	return {
		...policy,
		priority: ranking.priority,
		rankingReason: ranking.reason,
	}
}

export function rankInsurancePolicies(
	policies: RankablePolicyInput[],
): InsuranceKnowledgePolicy[] {
	return policies.map(rankInsurancePolicy).sort((a, b) => {
		const scoreA = computePriorityScore(a).score
		const scoreB = computePriorityScore(b).score

		if (scoreA !== scoreB) {
			return scoreB - scoreA
		}

		const expiryA = a.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER
		const expiryB = b.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER

		return expiryA - expiryB
	})
}

export function partitionRankedPolicies(policies: InsuranceKnowledgePolicy[]): {
	active: InsuranceKnowledgePolicy[]
	expiring: InsuranceKnowledgePolicy[]
	lapsed: InsuranceKnowledgePolicy[]
} {
	return {
		active: policies.filter((policy) => policy.status === 'active'),
		expiring: policies.filter((policy) => policy.isExpiringSoon),
		lapsed: policies.filter(
			(policy) =>
				policy.status === 'lapsed' ||
				policy.status === 'expired' ||
				policy.status === 'cancelled',
		),
	}
}

export function computeDaysUntilExpiry(
	expiryDate: string | null,
	renewalDate: string | null,
): number | null {
	const target = expiryDate ?? renewalDate

	if (!target) {
		return null
	}

	return Math.ceil(
		(new Date(target).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	)
}

export function isExpiringSoon(daysUntilExpiry: number | null): boolean {
	return (
		daysUntilExpiry != null &&
		daysUntilExpiry >= 0 &&
		daysUntilExpiry <= EXPIRING_SOON_DAYS
	)
}
