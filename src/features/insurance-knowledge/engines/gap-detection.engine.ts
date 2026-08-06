import type {
	CategorySnapshot,
	CoverageGap,
	PolicyHistory,
} from '@/features/insurance-knowledge/types/insurance-knowledge.types'

const CORE_CATEGORIES: Array<{
	categoryId: CoverageGap['categoryId']
	categoryName: string
	recommendation: string
}> = [
	{
		categoryId: 'health',
		categoryName: 'Health Insurance',
		recommendation:
			'Health insurance protects against hospitalization and medical costs.',
	},
	{
		categoryId: 'life_term',
		categoryName: 'Term / Life Insurance',
		recommendation: 'Term life insurance protects dependents if income stops.',
	},
	{
		categoryId: 'motor',
		categoryName: 'Vehicle Insurance',
		recommendation:
			'Motor insurance is legally required and protects against accident liability.',
	},
]

export function detectCoverageGaps(input: {
	categories: CategorySnapshot[]
	policyHistories: PolicyHistory[]
}): CoverageGap[] {
	const gaps: CoverageGap[] = []

	for (const core of CORE_CATEGORIES) {
		const snapshot = input.categories.find(
			(category) => category.categoryId === core.categoryId,
		)

		if (!snapshot || snapshot.activePolicyCount === 0) {
			gaps.push({
				id: `gap-${core.categoryId}`,
				categoryId: core.categoryId,
				categoryName: core.categoryName,
				severity: core.categoryId === 'health' ? 'critical' : 'warning',
				message: `No active ${core.categoryName.toLowerCase()} found.`,
				recommendation: core.recommendation,
			})
		}
	}

	for (const history of input.policyHistories) {
		if (
			history.policyType === 'life_term' &&
			history.status === 'active' &&
			history.nominees.length === 0
		) {
			gaps.push({
				id: `gap-nominee-${history.policyId}`,
				categoryId: 'life_term',
				categoryName: 'Term / Life Insurance',
				severity: 'warning',
				message: `Life policy ${history.policyNumber} has no nominee on record.`,
				recommendation: 'Confirm nominee details on your term policy schedule.',
			})
		}

		if (
			history.status === 'active' &&
			history.sumInsured == null &&
			history.coverages.length === 0
		) {
			gaps.push({
				id: `gap-si-${history.policyId}`,
				categoryId: 'health',
				categoryName: 'Coverage amount',
				severity: 'warning',
				message: `Policy ${history.policyNumber} is missing sum insured or coverage lines.`,
				recommendation:
					'Reprocess the policy schedule to extract coverage amounts.',
			})
		}
	}

	return dedupeGaps(gaps)
}

function dedupeGaps(gaps: CoverageGap[]): CoverageGap[] {
	const seen = new Set<string>()
	const result: CoverageGap[] = []

	for (const gap of gaps) {
		if (seen.has(gap.id)) {
			continue
		}

		seen.add(gap.id)
		result.push(gap)
	}

	return result
}
