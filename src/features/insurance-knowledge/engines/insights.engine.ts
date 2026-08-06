import type {
	DerivedInsuranceInsight,
	PolicyHistory,
} from '@/features/insurance-knowledge/types/insurance-knowledge.types'

export function buildDerivedInsights(input: {
	policyHistories: PolicyHistory[]
	activeCategoryCount: number
}): DerivedInsuranceInsight[] {
	const insights: DerivedInsuranceInsight[] = []
	const activePolicies = input.policyHistories.filter(
		(history) => history.status === 'active',
	)

	if (activePolicies.length === 0) {
		insights.push({
			id: 'insight-no-active-policies',
			text: 'No active insurance policies on record.',
			tone: 'warning',
		})
		return insights
	}

	insights.push({
		id: 'insight-active-count',
		text: `${activePolicies.length} active polic${activePolicies.length === 1 ? 'y' : 'ies'} across ${input.activeCategoryCount} coverage categor${input.activeCategoryCount === 1 ? 'y' : 'ies'}.`,
		tone: 'positive',
	})

	const expiring = activePolicies.filter((history) => {
		const target = history.expiryDate ?? history.renewalDate

		if (!target) {
			return false
		}

		const days = Math.ceil(
			(new Date(target).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
		)

		return days >= 0 && days <= 30
	})

	for (const history of expiring.slice(0, 3)) {
		insights.push({
			id: `insight-expiring-${history.policyId}`,
			text: `Policy ${history.policyNumber} renews soon.`,
			tone: 'warning',
			policyId: history.policyId,
		})
	}

	const openClaims = input.policyHistories.flatMap((history) =>
		history.claims
			.filter(
				(claim) => claim.status === 'filed' || claim.status === 'processing',
			)
			.map((claim) => ({ history, claim })),
	)

	for (const { history, claim } of openClaims.slice(0, 2)) {
		insights.push({
			id: `insight-claim-${claim.id}`,
			text: `Claim ${claim.claimNumber} on policy ${history.policyNumber} is ${claim.status}.`,
			tone: 'neutral',
			policyId: history.policyId,
		})
	}

	return insights.slice(0, 8)
}
