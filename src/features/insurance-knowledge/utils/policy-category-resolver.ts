import { mapPolicyTypeToCategoryId } from '@/features/insurance-knowledge/graph/policy-categories'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'

export function resolvePolicyCategoryId(input: {
	policyType: InsurancePolicyType
	folderHint?: string | null
	fallbackCategoryId?: PolicyCategoryId
}): PolicyCategoryId {
	if (input.folderHint) {
		const normalized = input.folderHint.toLowerCase()

		if (normalized.includes('term')) {
			return 'life_term'
		}

		if (normalized.includes('vehicle') || normalized.includes('motor')) {
			return 'motor'
		}

		if (normalized.includes('home')) {
			return 'home'
		}

		if (normalized.includes('travel')) {
			return 'travel'
		}

		if (normalized.includes('health')) {
			return 'health'
		}
	}

	return (
		mapPolicyTypeToCategoryId(input.policyType) ??
		input.fallbackCategoryId ??
		'health'
	)
}

export function normalizePolicyNumber(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function policyDedupeKey(input: {
	insurerId: string
	policyNumber: string
}): string {
	return `${input.insurerId}::${normalizePolicyNumber(input.policyNumber)}`
}
