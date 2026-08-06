import type {
	InsuranceKnowledgeClaim,
	InsuranceKnowledgePolicy,
	InsuranceKnowledgeSummary,
	InsuranceKnowledgeTimelineEvent,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type {
	InsuranceKnowledgeGraph,
	PolicyHistory,
} from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type { InsuranceDocumentRecord } from '@/features/insurance-knowledge/types/insurance-record.types'

export function buildKnowledgeTimeline(input: {
	policies: InsuranceKnowledgePolicy[]
	claims: InsuranceKnowledgeClaim[]
	documents: InsuranceDocumentRecord[]
	graph: InsuranceKnowledgeGraph
}): InsuranceKnowledgeTimelineEvent[] {
	const events: InsuranceKnowledgeTimelineEvent[] = []

	for (const history of input.graph.profile.policyHistories) {
		if (history.inceptionDate) {
			events.push({
				id: `timeline-purchased-${history.policyId}`,
				type: 'policy_purchased',
				title: history.productName ?? history.policyNumber,
				description: `Policy ${history.policyNumber} purchased.`,
				date: history.inceptionDate,
				evidenceIds: [`policy-${history.policyId}`],
				policyId: history.policyId,
			})
		}

		for (const renewal of history.renewals) {
			events.push({
				id: `timeline-renewed-${renewal.id}`,
				type: 'policy_renewed',
				title: history.productName ?? history.policyNumber,
				description: `Policy renewed${renewal.newPremium != null ? ` — premium ₹${renewal.newPremium.toLocaleString()}` : ''}.`,
				date: renewal.renewalDate,
				evidenceIds: [
					`policy-${history.policyId}`,
					...(renewal.sourceDocumentId
						? [`document-${renewal.sourceDocumentId}`]
						: []),
				],
				policyId: history.policyId,
				documentId: renewal.sourceDocumentId ?? undefined,
			})
		}

		for (const premium of history.premiums) {
			if (!premium.paidDate) {
				continue
			}

			events.push({
				id: `timeline-premium-${premium.id}`,
				type: 'premium_paid',
				title: history.productName ?? history.policyNumber,
				description: `Premium paid — ₹${premium.amount.toLocaleString()} ${premium.currency}.`,
				date: premium.paidDate,
				evidenceIds: [
					`policy-${history.policyId}`,
					...(premium.sourceDocumentId
						? [`document-${premium.sourceDocumentId}`]
						: []),
				],
				policyId: history.policyId,
				documentId: premium.sourceDocumentId ?? undefined,
			})
		}

		if (
			history.status === 'expired' ||
			history.status === 'lapsed' ||
			history.status === 'cancelled'
		) {
			events.push({
				id: `timeline-expired-${history.policyId}`,
				type:
					history.status === 'cancelled' ? 'policy_closed' : 'policy_expired',
				title: history.productName ?? history.policyNumber,
				description: `Policy ${history.status}.`,
				date:
					history.expiryDate ?? history.renewalDate ?? new Date().toISOString(),
				evidenceIds: [`policy-${history.policyId}`],
				policyId: history.policyId,
			})
		}
	}

	for (const claim of input.claims) {
		if (claim.filedDate) {
			events.push({
				id: `timeline-claim-filed-${claim.id}`,
				type: 'claim_filed',
				title: `Claim ${claim.claimNumber}`,
				description: claim.claimType
					? `${claim.claimType} claim filed.`
					: 'Insurance claim filed.',
				date: claim.filedDate,
				evidenceIds: [`claim-${claim.id}`, `policy-${claim.policyId}`],
				policyId: claim.policyId,
				claimId: claim.id,
			})
		}

		if (claim.settledDate || claim.status === 'paid') {
			events.push({
				id: `timeline-claim-settled-${claim.id}`,
				type: 'claim_settled',
				title: `Claim ${claim.claimNumber}`,
				description:
					claim.approvedAmount != null
						? `Claim settled — ₹${claim.approvedAmount.toLocaleString()} approved.`
						: 'Claim settled.',
				date: claim.settledDate ?? claim.filedDate ?? new Date().toISOString(),
				evidenceIds: [`claim-${claim.id}`, `policy-${claim.policyId}`],
				policyId: claim.policyId,
				claimId: claim.id,
			})
		}
	}

	for (const document of input.documents) {
		if (document.status !== 'completed') {
			continue
		}

		events.push({
			id: `timeline-document-${document.id}`,
			type: 'document_imported',
			title: document.fileName,
			description: `${document.documentKind.replace(/_/g, ' ')} imported.`,
			date: document.processedAt ?? document.uploadedAt,
			evidenceIds: [`document-${document.id}`],
			documentId: document.id,
		})
	}

	return events.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	)
}

export function buildDeterministicSummary(input: {
	policies: InsuranceKnowledgePolicy[]
	activePolicies: InsuranceKnowledgePolicy[]
	expiringPolicies: InsuranceKnowledgePolicy[]
	claims: InsuranceKnowledgeClaim[]
}): InsuranceKnowledgeSummary {
	const displayReadyPolicies = input.policies.filter(
		(policy) => policy.isDisplayReady,
	)
	const totalSumInsured = input.activePolicies.reduce<number | null>(
		(sum, policy) => {
			if (policy.sumInsured == null) {
				return sum
			}

			return (sum ?? 0) + policy.sumInsured
		},
		null,
	)
	const currency = input.activePolicies[0]?.currency ?? 'INR'
	const lines: string[] = []

	if (displayReadyPolicies.length === 0) {
		return {
			headline: 'No insurance policies available.',
			lines: ['Import insurance documents to build protection knowledge.'],
			policyCount: 0,
			activePolicyCount: 0,
			expiringCount: 0,
			claimCount: 0,
			totalSumInsured: null,
			currency,
		}
	}

	lines.push(
		`${displayReadyPolicies.length} polic${displayReadyPolicies.length === 1 ? 'y' : 'ies'} on record.`,
	)
	lines.push(
		`${input.activePolicies.length} active polic${input.activePolicies.length === 1 ? 'y' : 'ies'}.`,
	)

	if (input.expiringPolicies.length > 0) {
		lines.push(
			`${input.expiringPolicies.length} polic${input.expiringPolicies.length === 1 ? 'y renews' : 'ies renew'} within 30 days.`,
		)
	}

	if (totalSumInsured != null) {
		lines.push(
			`Total active cover: ₹${totalSumInsured.toLocaleString()} ${currency}.`,
		)
	}

	if (input.claims.length > 0) {
		lines.push(
			`${input.claims.length} claim${input.claims.length === 1 ? '' : 's'} on record.`,
		)
	}

	const headline =
		input.expiringPolicies.length > 0
			? `${input.expiringPolicies.length} polic${input.expiringPolicies.length === 1 ? 'y needs' : 'ies need'} renewal soon.`
			: input.activePolicies.length > 0
				? `${input.activePolicies.length} active polic${input.activePolicies.length === 1 ? 'y' : 'ies'} — protection knowledge assembled.`
				: 'Insurance knowledge assembled from imported documents.'

	return {
		headline,
		lines,
		policyCount: displayReadyPolicies.length,
		activePolicyCount: input.activePolicies.length,
		expiringCount: input.expiringPolicies.length,
		claimCount: input.claims.length,
		totalSumInsured,
		currency,
	}
}

export function buildPolicyHistoryTimeline(
	history: PolicyHistory,
): InsuranceKnowledgeTimelineEvent[] {
	return buildKnowledgeTimeline({
		policies: [],
		claims: history.claims.map((claim) => ({
			id: claim.id,
			policyId: claim.policyId,
			claimNumber: claim.claimNumber,
			claimType: claim.claimType,
			filedDate: claim.filedDate,
			settledDate: claim.settledDate,
			claimedAmount: claim.claimedAmount,
			approvedAmount: claim.approvedAmount,
			status: claim.status,
			providerName: claim.providerName,
			priority: 'medium',
		})),
		documents: [],
		graph: {
			profile: {
				personId: '',
				policyHistories: [history],
				categories: [],
				insights: [],
				alerts: [],
				coverageGaps: [],
				relationships: [],
				documentIds: [],
				policyIds: [history.policyId],
				generatedAt: '',
				cacheVersion: '1',
			},
			policyCategories: [],
			insurers: [],
		},
	})
}
