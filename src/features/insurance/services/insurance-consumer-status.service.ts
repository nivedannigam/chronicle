import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

export type ConsumerProtectionStatus =
	| 'Excellent'
	| 'Well Protected'
	| 'Mostly Protected'
	| 'Some Gaps Found'
	| 'Needs Attention'
	| 'Getting Started'

export type ConsumerCoverageStatus = 'Protected' | 'Partial' | 'Missing'

/** Per life-area status on Protection screens. */
export type ConsumerProtectionAreaStatus =
	'Excellent' | 'Protected' | 'Partial' | 'Needs Attention' | 'Missing'

export function deriveConsumerProtectionStatus(
	knowledge: InsuranceKnowledge,
): ConsumerProtectionStatus {
	if (knowledge.policies.length === 0) {
		return 'Getting Started'
	}

	const score = knowledge.protectionScore
	const criticalGaps = knowledge.coverageGaps.filter(
		(gap) => gap.severity === 'critical',
	).length
	const expiring = knowledge.expiringPolicies.length
	const lapsed = knowledge.lapsedPolicies.length

	if (lapsed > 0 || expiring > 0) {
		return 'Needs Attention'
	}

	if (criticalGaps > 0) {
		return 'Some Gaps Found'
	}

	if (score == null) {
		return 'Getting Started'
	}

	if (score >= 85 && knowledge.activePolicies.length >= 3) {
		return 'Excellent'
	}

	if (score >= 70) {
		return 'Well Protected'
	}

	if (score >= 50) {
		return 'Mostly Protected'
	}

	return 'Some Gaps Found'
}

export function consumerProtectionSummary(
	status: ConsumerProtectionStatus,
): string {
	switch (status) {
		case 'Excellent':
			return 'Your family is well covered across the areas that matter most.'
		case 'Well Protected':
			return 'You have solid protection in place. A few areas could still be strengthened.'
		case 'Mostly Protected':
			return 'You have meaningful cover, with some gaps worth reviewing.'
		case 'Some Gaps Found':
			return 'A few important areas may not be fully protected yet.'
		case 'Needs Attention':
			return 'Something needs your attention — a renewal, lapse, or open claim.'
		case 'Getting Started':
		default:
			return 'Your protection picture will appear as policies are added.'
	}
}

export function deriveCategoryCoverageStatus(input: {
	activePolicyCount: number
	policyCount: number
	totalSumInsured: number | null
	categoryId: PolicyCategoryId
	hasGap: boolean
}): ConsumerCoverageStatus {
	if (input.policyCount > 0 && input.activePolicyCount === 0) {
		return 'Partial'
	}

	if (input.activePolicyCount === 0 || input.hasGap) {
		return input.activePolicyCount > 0 ? 'Partial' : 'Missing'
	}

	if (input.totalSumInsured != null && input.totalSumInsured > 0) {
		return 'Protected'
	}

	return input.activePolicyCount > 0 ? 'Partial' : 'Missing'
}

export function consumerCoverageStatusLabel(
	status: ConsumerCoverageStatus,
): string {
	switch (status) {
		case 'Protected':
			return 'Protected'
		case 'Partial':
			return 'Partial'
		case 'Missing':
		default:
			return 'Missing'
	}
}

export function protectionStatusColor(
	status: ConsumerProtectionStatus,
): string {
	switch (status) {
		case 'Excellent':
			return '#34D399'
		case 'Well Protected':
			return '#2DD4BF'
		case 'Mostly Protected':
			return '#60A5FA'
		case 'Some Gaps Found':
			return '#FBBF24'
		case 'Needs Attention':
			return '#FB923C'
		case 'Getting Started':
		default:
			return 'rgba(255,255,255,0.45)'
	}
}

export function coverageStatusColor(status: ConsumerCoverageStatus): string {
	switch (status) {
		case 'Protected':
			return '#34D399'
		case 'Partial':
			return '#FBBF24'
		case 'Missing':
		default:
			return 'rgba(255,255,255,0.35)'
	}
}

export function consumerProtectionAreaLabel(
	status: ConsumerProtectionAreaStatus,
): string {
	return status
}

export function protectionAreaStatusColor(
	status: ConsumerProtectionAreaStatus,
): string {
	switch (status) {
		case 'Excellent':
			return '#34D399'
		case 'Protected':
			return '#2DD4BF'
		case 'Partial':
			return '#FBBF24'
		case 'Needs Attention':
			return '#FB923C'
		case 'Missing':
		default:
			return 'rgba(255,255,255,0.35)'
	}
}

export function deriveProtectionAreaStatus(input: {
	activePolicyCount: number
	policyCount: number
	totalSumInsured: number | null
	hasGap: boolean
	hasExpiring: boolean
	hasLapsed: boolean
	hasOpenClaims: boolean
	hasNominees?: boolean
	memberCount: number
}): ConsumerProtectionAreaStatus {
	if (input.policyCount === 0) {
		return 'Missing'
	}

	if (input.hasLapsed || input.hasExpiring || input.hasOpenClaims) {
		return 'Needs Attention'
	}

	if (input.activePolicyCount === 0) {
		return input.policyCount > 0 ? 'Partial' : 'Missing'
	}

	if (input.hasGap || input.totalSumInsured == null) {
		return 'Partial'
	}

	const isExcellent =
		input.totalSumInsured >= 10000000 ||
		(input.totalSumInsured >= 500000 &&
			input.memberCount >= 2 &&
			input.hasNominees)

	if (isExcellent) {
		return 'Excellent'
	}

	if (input.totalSumInsured > 0) {
		return 'Protected'
	}

	return 'Partial'
}

export function formatCoverageAmount(
	amount: number | null,
	currency: string,
): string {
	if (amount == null) {
		return '—'
	}

	if (currency === 'INR') {
		if (amount >= 10000000) {
			return `₹${(amount / 10000000).toFixed(amount % 10000000 === 0 ? 0 : 1)} Cr`
		}

		if (amount >= 100000) {
			return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)} L`
		}

		return `₹${amount.toLocaleString('en-IN')}`
	}

	return `${currency} ${amount.toLocaleString()}`
}
