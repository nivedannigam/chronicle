import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import type { InsuranceProviderSource } from '@/features/insurance/providers/insurance-provider-source.types'
import type {
	RetrievalQuery,
	RetrievedKnowledge,
	RetrievedReport,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'

function formatDate(value: string | null | undefined): string {
	if (!value) {
		return '—'
	}

	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function formatAmount(value: number | null, currency: string): string {
	if (value == null) {
		return '—'
	}

	return `${currency} ${value.toLocaleString()}`
}

function toRetrievedPolicyReport(
	policy: InsuranceKnowledge['policies'][number],
): RetrievedReport {
	return {
		id: policy.id,
		title: policy.productName ?? policy.policyNumber,
		date: policy.inceptionDate ?? policy.expiryDate ?? '—',
		lab: policy.insurerName,
		category: policy.categoryId,
		summary: [
			`Policy ${policy.policyNumber}`,
			policy.status,
			policy.sumInsured != null
				? `Sum insured ${formatAmount(policy.sumInsured, policy.currency)}`
				: null,
			policy.expiryDate ? `Expires ${formatDate(policy.expiryDate)}` : null,
		]
			.filter(Boolean)
			.join(' · '),
	}
}

function toRetrievedClaimReport(
	claim: InsuranceKnowledge['claims'][number],
	policies: InsuranceKnowledge['policies'],
): RetrievedReport {
	const policy = policies.find((item) => item.id === claim.policyId)

	return {
		id: claim.id,
		title: claim.claimNumber ?? `Claim ${claim.id.slice(0, 8)}`,
		date: claim.filedDate ?? claim.settledDate ?? '—',
		lab: claim.providerName ?? policy?.insurerName ?? 'Insurance',
		category: 'claim',
		summary: [
			claim.claimType,
			claim.status,
			claim.claimedAmount != null
				? `Claimed ${formatAmount(claim.claimedAmount, policy?.currency ?? 'INR')}`
				: null,
		]
			.filter(Boolean)
			.join(' · '),
	}
}

function filterKnowledge(
	knowledge: InsuranceKnowledge,
	query: RetrievalQuery,
): InsuranceKnowledge {
	let policies = knowledge.policies
	let claims = knowledge.claims

	if (query.member?.memberId && knowledge.familyMember.id) {
		const memberId = query.member.memberId

		if (knowledge.familyMember.id !== memberId) {
			const linkedPolicyIds = new Set(
				knowledge.members
					.filter((member) => member.familyMemberId === memberId)
					.map((member) => member.policyId),
			)

			policies = policies.filter((policy) => linkedPolicyIds.has(policy.id))
			claims = claims.filter((claim) => linkedPolicyIds.has(claim.policyId))
		}
	}

	return {
		...knowledge,
		policies,
		claims,
		activePolicies: policies.filter((policy) => policy.status === 'active'),
		expiringPolicies: policies.filter((policy) => policy.isExpiringSoon),
		lapsedPolicies: policies.filter(
			(policy) =>
				policy.status === 'expired' ||
				policy.status === 'lapsed' ||
				policy.status === 'cancelled',
		),
	}
}

function resolveInsuranceKnowledge(
	query: RetrievalQuery,
): InsuranceKnowledge | null {
	const source = query.sources?.insurance as InsuranceProviderSource | undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.rawData && source.userId) {
		return insuranceKnowledgeProvider.buildFromRawData(source.rawData, {
			userId: source.userId,
			familyMemberId: source.familyMemberId ?? null,
			accountOwnerMemberId: source.accountOwnerMemberId ?? null,
		})
	}

	return null
}

function buildRetrievedKnowledge(
	knowledge: InsuranceKnowledge,
	query: RetrievalQuery,
): RetrievedKnowledge {
	const filtered = filterKnowledge(knowledge, query)
	const reports = [
		...filtered.policies.map(toRetrievedPolicyReport),
		...filtered.claims.map((claim) =>
			toRetrievedClaimReport(claim, filtered.policies),
		),
	]

	return {
		domain: 'insurance',
		intent: query.intent,
		reports,
		metrics: [],
		timelines: [],
		trends: [],
		observations: [],
		relationships: [],
		insights: filtered.insights.map((insight) => insight.text),
		alerts: filtered.limitations
			.filter((limitation) => limitation.severity !== 'info')
			.map((limitation) => limitation.message),
		summaryLines: filtered.summary.lines.length
			? filtered.summary.lines
			: [filtered.summary.headline],
		comparisons: [],
	}
}

export class InsuranceKnowledgeRetriever {
	readonly domain = 'insurance' as const

	retrieve(query: RetrievalQuery): RetrievedKnowledge {
		const knowledge = resolveInsuranceKnowledge(query)

		if (!knowledge) {
			return {
				domain: 'insurance',
				intent: query.intent,
				reports: [],
				metrics: [],
				timelines: [],
				trends: [],
				observations: [],
				relationships: [],
				insights: [],
				alerts: [],
				summaryLines: [],
				comparisons: [],
			}
		}

		return buildRetrievedKnowledge(knowledge, query)
	}
}

export const insuranceKnowledgeRetriever = new InsuranceKnowledgeRetriever()
