import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceAskScope } from '@/features/insurance/types/insurance-ask.types'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'

const RESOLVER_ID = 'insurance.evidence_resolver.v1'

function resolvePolicyScope(
	knowledge: InsuranceKnowledge,
	question: string,
	scope?: InsuranceAskScope,
) {
	if (scope?.policyId) {
		return (
			knowledge.policies.find((policy) => policy.id === scope.policyId) ?? null
		)
	}

	if (scope?.categoryId) {
		const inCategory = knowledge.policies.filter(
			(policy) => policy.categoryId === scope.categoryId,
		)

		if (inCategory.length === 1) {
			return inCategory[0] ?? null
		}

		const normalized = question.toLowerCase()
		return (
			inCategory.find((policy) =>
				normalized.includes((policy.productName ?? '').toLowerCase()),
			) ??
			inCategory[0] ??
			null
		)
	}

	const normalized = question.toLowerCase()

	return (
		knowledge.policies.find((policy) =>
			normalized.includes((policy.productName ?? '').toLowerCase()),
		) ??
		knowledge.policies.find((policy) =>
			normalized.includes(policy.policyNumber.toLowerCase()),
		) ??
		knowledge.policies[0] ??
		null
	)
}

function resolveScopedClaim(
	knowledge: InsuranceKnowledge,
	scope?: InsuranceAskScope,
) {
	if (!scope?.claimId) {
		return null
	}

	return knowledge.claims.find((claim) => claim.id === scope.claimId) ?? null
}

export function resolveInsuranceEvidence(input: {
	knowledge: InsuranceKnowledge
	request: EvidenceRequest
	scope?: InsuranceAskScope
}): EvidenceBundle {
	const question = input.request.question.toLowerCase()
	const scopedClaim = resolveScopedClaim(input.knowledge, input.scope)
	const scopedPolicy =
		resolvePolicyScope(
			input.knowledge,
			input.request.question,
			scopedClaim ? { policyId: scopedClaim.policyId } : input.scope,
		) ??
		(scopedClaim
			? (input.knowledge.policies.find(
					(policy) => policy.id === scopedClaim.policyId,
				) ?? null)
			: null)
	const policies = scopedPolicy ? [scopedPolicy] : input.knowledge.policies

	if (scopedClaim) {
		return buildClaimOverview(input.knowledge, scopedClaim, scopedPolicy)
	}

	switch (input.request.questionType) {
		case 'FACT_LOOKUP':
			return buildFactLookup(input.knowledge, scopedPolicy, question)
		case 'LATEST_REPORT':
			return buildLatestPolicy(input.knowledge, scopedPolicy)
		case 'TREND':
			return buildTimelineTrend(input.knowledge, scopedPolicy)
		case 'STATUS_OVERVIEW':
		case 'EXPLAIN':
		default:
			return buildStatusOverview(input.knowledge, scopedPolicy, policies)
	}
}

function buildClaimOverview(
	knowledge: InsuranceKnowledge,
	claim: InsuranceKnowledge['claims'][number],
	scopedPolicy: InsuranceKnowledge['policies'][number] | null,
): EvidenceBundle {
	const lines = [
		`Claim ${claim.claimNumber}`,
		claim.status ? `Status: ${claim.status}` : 'Status not found yet',
		claim.approvedAmount != null
			? `Approved amount: ${claim.approvedAmount}`
			: claim.claimedAmount != null
				? `Claimed amount: ${claim.claimedAmount}`
				: 'Amount not found yet',
	]

	if (scopedPolicy) {
		lines.push(
			`Policy: ${scopedPolicy.productName ?? scopedPolicy.policyNumber}`,
		)
	}

	return {
		reports: scopedPolicy
			? [
					{
						id: scopedPolicy.id,
						title: scopedPolicy.productName ?? scopedPolicy.policyNumber,
						date: claim.filedDate ?? claim.settledDate ?? '',
						lab: scopedPolicy.insurerName,
						metricCount: 0,
						reportType: scopedPolicy.categoryId,
					},
				]
			: [],
		metrics: [],
		trends: [],
		timeline: knowledge.timeline
			.filter((event) => event.claimId === claim.id)
			.slice(0, 5)
			.map((event) => ({
				id: event.id,
				type: event.type,
				title: event.title,
				description: event.description ?? '',
				date: event.date,
			})),
		summary: {
			headline: `Claim ${claim.claimNumber}`,
			lines,
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildStatusOverview(
	knowledge: InsuranceKnowledge,
	scopedPolicy: InsuranceKnowledge['policies'][number] | null,
	policies: InsuranceKnowledge['policies'],
): EvidenceBundle {
	const lines = scopedPolicy
		? [
				`${scopedPolicy.productName ?? 'Policy'} · ${scopedPolicy.insurerName}`,
				scopedPolicy.expiryDate
					? `Valid until ${scopedPolicy.expiryDate}`
					: 'Expiry date not found yet',
				scopedPolicy.sumInsured != null
					? `Sum insured ${scopedPolicy.sumInsured} ${scopedPolicy.currency}`
					: 'Coverage amount not found yet',
			]
		: [
				`${policies.length} polic${policies.length === 1 ? 'y' : 'ies'} on record`,
				knowledge.summary.headline,
			]

	return {
		reports: policies.slice(0, 5).map((policy) => ({
			id: policy.id,
			title: policy.productName ?? policy.policyNumber,
			date: policy.expiryDate ?? policy.inceptionDate ?? '',
			lab: policy.insurerName,
			metricCount: 0,
			reportType: policy.categoryId,
		})),
		metrics: [],
		trends: [],
		timeline: knowledge.timeline.slice(0, 5).map((event) => ({
			id: event.id,
			type: event.type,
			title: event.title,
			description: event.description ?? '',
			date: event.date,
		})),
		summary: {
			headline: scopedPolicy
				? `${scopedPolicy.productName ?? 'Policy'} insurance`
				: knowledge.summary.headline,
			lines,
			healthScore: knowledge.protectionScore,
			limitations: knowledge.limitations.map((item) => item.message),
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildFactLookup(
	knowledge: InsuranceKnowledge,
	scopedPolicy: InsuranceKnowledge['policies'][number] | null,
	question: string,
): EvidenceBundle {
	const lines: string[] = []

	if (question.includes('premium')) {
		const premiums = scopedPolicy
			? knowledge.premiums.filter(
					(premium) => premium.policyId === scopedPolicy.id,
				)
			: knowledge.premiums

		const latest = [...premiums].sort((left, right) => {
			const dateA = Date.parse(left.paidDate ?? left.dueDate ?? '')
			const dateB = Date.parse(right.paidDate ?? right.dueDate ?? '')
			return dateB - dateA
		})[0]

		if (latest) {
			lines.push(
				`Premium: ${latest.amount} ${latest.currency}${latest.frequency !== 'unknown' ? ` (${latest.frequency})` : ''}`,
			)
		} else {
			lines.push('Premium information not found in extracted policy data yet.')
		}
	} else if (question.includes('expir') || question.includes('renew')) {
		lines.push(
			scopedPolicy?.expiryDate
				? `Expiry date: ${scopedPolicy.expiryDate}`
				: 'Renewal/expiry information not found yet.',
		)
	} else if (question.includes('cover') || question.includes('sum insured')) {
		lines.push(
			scopedPolicy?.sumInsured != null
				? `Sum insured ${scopedPolicy.sumInsured} ${scopedPolicy.currency}`
				: 'Coverage amount not found yet.',
		)
	} else if (scopedPolicy) {
		lines.push(
			`Policy number: ${scopedPolicy.policyNumber}`,
			`Insurer: ${scopedPolicy.insurerName}`,
		)
	}

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: scopedPolicy?.productName ?? 'Insurance fact lookup',
			lines,
			healthScore: null,
			limitations:
				lines.length === 0 ? ['We have not found this information yet.'] : [],
		},
		metadata: {
			questionType: 'FACT_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildLatestPolicy(
	knowledge: InsuranceKnowledge,
	scopedPolicy: InsuranceKnowledge['policies'][number] | null,
): EvidenceBundle {
	const policy =
		scopedPolicy ??
		[...knowledge.policies].sort((left, right) =>
			(right.expiryDate ?? '').localeCompare(left.expiryDate ?? ''),
		)[0] ??
		null

	return {
		reports: policy
			? [
					{
						id: policy.id,
						title: policy.productName ?? policy.policyNumber,
						date: policy.expiryDate ?? policy.inceptionDate ?? '',
						lab: policy.insurerName,
						metricCount: 0,
						reportType: policy.categoryId,
					},
				]
			: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: policy
				? `Latest policy: ${policy.productName}`
				: 'No policies found',
			lines: policy
				? [
						policy.productName ?? 'Policy',
						policy.expiryDate
							? `Valid until ${policy.expiryDate}`
							: 'Expiry date not found yet',
					]
				: ['No display-ready policies found yet.'],
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'LATEST_REPORT',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildTimelineTrend(
	knowledge: InsuranceKnowledge,
	scopedPolicy: InsuranceKnowledge['policies'][number] | null,
): EvidenceBundle {
	const timeline = knowledge.timeline.filter(
		(event) => !scopedPolicy || event.policyId === scopedPolicy.id,
	)

	return {
		reports: [],
		metrics: [],
		trends:
			timeline.length > 0
				? [
						{
							metricId: 'insurance_timeline',
							displayName: 'Insurance timeline',
							direction: 'stable',
							changePercent: null,
							dataPointCount: timeline.length,
							isActionable: false,
						},
					]
				: [],
		timeline: timeline.map((event) => ({
			id: event.id,
			type: event.type,
			title: event.title,
			description: event.description ?? '',
			date: event.date,
		})),
		summary: {
			headline: 'Insurance timeline',
			lines: timeline
				.slice(0, 5)
				.map((event) => `${event.date} · ${event.title}`),
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'TREND',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

export function supportsInsuranceEvidenceQuestion(
	questionType: QuestionType,
): boolean {
	return [
		'STATUS_OVERVIEW',
		'FACT_LOOKUP',
		'LATEST_REPORT',
		'TREND',
		'EXPLAIN',
	].includes(questionType)
}
