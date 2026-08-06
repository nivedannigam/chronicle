import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import { getCategoryMeta } from '@/features/insurance-knowledge/graph/policy-categories'
import {
	deriveProtectionAreaStatus,
	formatCoverageAmount,
	protectionAreaStatusColor,
	type ConsumerProtectionAreaStatus,
} from '@/features/insurance/services/insurance-consumer-status.service'
import type { InsuranceActivityItem } from '@/features/insurance/services/insurance-home.mapper'

const CORE_CATEGORY_IDS: PolicyCategoryId[] = ['health', 'life_term', 'motor']

const ALL_CATEGORY_IDS: PolicyCategoryId[] = [
	'health',
	'life_term',
	'motor',
	'home',
	'travel',
]

const SHORT_NAMES: Record<PolicyCategoryId, string> = {
	health: 'Health',
	life_term: 'Life',
	motor: 'Vehicle',
	home: 'Home',
	travel: 'Travel',
}

export interface ProtectionAreaCard {
	id: PolicyCategoryId
	emoji: string
	name: string
	shortName: string
	status: ConsumerProtectionAreaStatus
	statusColor: string
	coverageLabel: string
	coverageSubLabel: string | null
	expiryLabel: string | null
	insurerLabel: string | null
	coveredMembers: string[]
	assetLabels: string[]
	summary: string
	policyCount: number
	badge: string | null
	isApplicable: boolean
}

export interface ProtectionOverviewViewModel {
	headline: string
	subtitle: string
	areas: ProtectionAreaCard[]
	recommendations: Array<{
		id: string
		title: string
		priority: 'high' | 'medium' | 'low'
	}>
}

export interface ProtectionPolicyCard {
	id: string
	name: string
	insurer: string
	coverageAmount: string
	statusLabel: string
	renewalLabel: string | null
	memberCount: number
}

export interface ProtectionDetailViewModel {
	area: ProtectionAreaCard
	coverageSummary: string
	policies: ProtectionPolicyCard[]
	benefits: string[]
	exclusions: string[]
	timeline: InsuranceActivityItem[]
	claims: Array<{
		id: string
		title: string
		status: string
		amount: string | null
		dateLabel: string | null
	}>
	documents: Array<{
		id: string
		title: string
		dateLabel: string
	}>
	recommendations: Array<{
		id: string
		title: string
		priority: 'high' | 'medium' | 'low'
	}>
	askPrompt: string
}

function formatRenewalLabel(
	expiryDate: string | null,
	renewalDate: string | null,
	daysUntilExpiry: number | null,
): string | null {
	const target = renewalDate ?? expiryDate

	if (!target) {
		return null
	}

	if (
		daysUntilExpiry != null &&
		daysUntilExpiry >= 0 &&
		daysUntilExpiry <= 30
	) {
		return `Renews in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
	}

	return `Renewal ${new Date(target).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	})}`
}

function formatActivityDate(date: string): string {
	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return ''
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function humanizeTimelineTitle(
	event: InsuranceKnowledge['timeline'][number],
): string {
	switch (event.type) {
		case 'policy_purchased':
			return `${event.title} added`
		case 'policy_renewed':
			return `${event.title} renewed`
		case 'premium_paid':
			return 'Premium paid'
		case 'claim_filed':
			return 'Claim filed'
		case 'claim_settled':
			return 'Claim approved'
		case 'policy_expired':
			return `${event.title} expired`
		default:
			return event.title
	}
}

function buildAreaSummary(input: {
	categoryId: PolicyCategoryId
	status: ConsumerProtectionAreaStatus
	insurerLabel: string | null
	memberCount: number
	coverageLabel: string
	gapMessage: string | null
}): string {
	if (input.status === 'Missing') {
		return (
			input.gapMessage ??
			`No ${SHORT_NAMES[input.categoryId].toLowerCase()} cover on record yet.`
		)
	}

	if (input.categoryId === 'motor') {
		if (input.coverageLabel.includes('Vehicle')) {
			return `Your vehicles are covered${input.insurerLabel ? ` through ${input.insurerLabel}` : ''}.`
		}
	}

	if (input.categoryId === 'life_term') {
		return input.insurerLabel
			? `Life cover through ${input.insurerLabel}.`
			: 'Life cover is active for your family.'
	}

	if (input.memberCount > 0) {
		return `Cover for ${input.memberCount} family member${input.memberCount === 1 ? '' : 's'}${input.insurerLabel ? ` with ${input.insurerLabel}` : ''}.`
	}

	return input.insurerLabel
		? `${SHORT_NAMES[input.categoryId]} protection through ${input.insurerLabel}.`
		: `${SHORT_NAMES[input.categoryId]} protection is active.`
}

function aggregateInsurerLabel(
	policies: InsuranceKnowledge['policies'],
): string | null {
	const names = [
		...new Set(policies.map((policy) => policy.insurerName).filter(Boolean)),
	]

	if (names.length === 0) {
		return null
	}

	if (names.length === 1) {
		return names[0] ?? null
	}

	return names.slice(0, 2).join(' · ')
}

function buildCoverageLabel(
	categoryId: PolicyCategoryId,
	policies: InsuranceKnowledge['policies'],
	totalSumInsured: number | null,
	currency: string,
): { label: string; subLabel: string | null } {
	const activePolicies = policies.filter((policy) => policy.status === 'active')

	if (categoryId === 'motor') {
		if (activePolicies.length > 1) {
			return {
				label: `${activePolicies.length} Vehicles`,
				subLabel: null,
			}
		}

		if (activePolicies.length === 1) {
			const policy = activePolicies[0]!
			return {
				label: policy.productName ?? '1 Vehicle',
				subLabel: formatCoverageAmount(policy.sumInsured, policy.currency),
			}
		}
	}

	if (totalSumInsured != null && totalSumInsured > 0) {
		return {
			label: formatCoverageAmount(totalSumInsured, currency),
			subLabel:
				activePolicies.length > 1
					? `${activePolicies.length} policies combined`
					: null,
		}
	}

	if (activePolicies.length > 0) {
		return {
			label: `${activePolicies.length} active`,
			subLabel: null,
		}
	}

	return { label: '—', subLabel: null }
}

export function buildProtectionAreaCard(
	knowledge: InsuranceKnowledge,
	categoryId: PolicyCategoryId,
): ProtectionAreaCard {
	const meta = getCategoryMeta(categoryId)
	const snapshot = knowledge.coverageByCategory.find(
		(item) => item.categoryId === categoryId,
	)
	const policies = knowledge.policies.filter(
		(policy) => policy.categoryId === categoryId,
	)
	const activePolicies = policies.filter((policy) => policy.status === 'active')
	const policyIds = new Set(policies.map((policy) => policy.id))
	const members = [
		...new Set(
			knowledge.members
				.filter((member) => policyIds.has(member.policyId))
				.map((member) => member.name),
		),
	]
	const nominees = knowledge.nominees.filter((nominee) =>
		policyIds.has(nominee.policyId),
	)
	const gap = knowledge.coverageGaps.find(
		(item) => item.categoryId === categoryId,
	)
	const hasExpiring = activePolicies.some((policy) => policy.isExpiringSoon)
	const hasLapsed = policies.some(
		(policy) =>
			policy.status === 'lapsed' ||
			policy.status === 'expired' ||
			policy.status === 'cancelled',
	)
	const hasOpenClaims = knowledge.claims.some(
		(claim) =>
			policyIds.has(claim.policyId) &&
			(claim.status === 'filed' ||
				claim.status === 'processing' ||
				claim.status === 'approved'),
	)
	const status = deriveProtectionAreaStatus({
		activePolicyCount: activePolicies.length,
		policyCount: policies.length,
		totalSumInsured: snapshot?.totalSumInsured ?? null,
		hasGap: Boolean(gap),
		hasExpiring,
		hasLapsed,
		hasOpenClaims,
		hasNominees: nominees.length > 0,
		memberCount: members.length,
	})
	const coverage = buildCoverageLabel(
		categoryId,
		policies,
		snapshot?.totalSumInsured ?? null,
		snapshot?.currency ?? 'INR',
	)
	const assetLabels = activePolicies
		.map((policy) => policy.productName)
		.filter((name): name is string => Boolean(name?.trim()))
	const soonest = [...activePolicies]
		.filter((policy) => policy.daysUntilExpiry != null)
		.sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999))[0]
	const expiryLabel = soonest
		? formatRenewalLabel(
				soonest.expiryDate,
				soonest.renewalDate,
				soonest.daysUntilExpiry,
			)
		: null
	const isApplicable =
		policies.length > 0 ||
		Boolean(gap) ||
		CORE_CATEGORY_IDS.includes(categoryId)

	let badge: string | null = null

	if (categoryId === 'life_term' && nominees.length > 0) {
		badge = 'Nominee verified'
	}

	if (activePolicies.length > 1 && categoryId !== 'motor') {
		badge = badge ?? 'Combined cover'
	}

	return {
		id: categoryId,
		emoji: meta.emoji,
		name: meta.name,
		shortName: SHORT_NAMES[categoryId],
		status,
		statusColor: protectionAreaStatusColor(status),
		coverageLabel: coverage.label,
		coverageSubLabel: coverage.subLabel,
		expiryLabel,
		insurerLabel: aggregateInsurerLabel(policies),
		coveredMembers: members,
		assetLabels,
		summary: buildAreaSummary({
			categoryId,
			status,
			insurerLabel: aggregateInsurerLabel(policies),
			memberCount: members.length,
			coverageLabel: coverage.label,
			gapMessage: gap?.message ?? null,
		}),
		policyCount: policies.length,
		badge,
		isApplicable,
	}
}

export function buildProtectionOverviewViewModel(
	knowledge: InsuranceKnowledge,
): ProtectionOverviewViewModel {
	const areas = ALL_CATEGORY_IDS.map((categoryId) =>
		buildProtectionAreaCard(knowledge, categoryId),
	).filter((area) => area.isApplicable)

	const categoryRecommendations = knowledge.coverageGaps.map((gap) => ({
		id: gap.id,
		title: gap.recommendation,
		priority:
			gap.severity === 'critical' ? ('high' as const) : ('medium' as const),
	}))

	return {
		headline: 'Your protection',
		subtitle: 'Where your life is covered — organized by what matters',
		areas,
		recommendations: [
			...categoryRecommendations,
			...knowledge.recommendations.slice(0, 4).map((item) => ({
				id: item.id,
				title: item.text,
				priority: item.priority,
			})),
		]
			.filter(
				(item, index, list) =>
					list.findIndex((other) => other.id === item.id) === index,
			)
			.slice(0, 4),
	}
}

export function findProtectionArea(
	overview: ProtectionOverviewViewModel,
	categoryId: string,
): ProtectionAreaCard | null {
	return overview.areas.find((area) => area.id === categoryId) ?? null
}

export function buildProtectionDetailViewModel(input: {
	knowledge: InsuranceKnowledge
	categoryId: PolicyCategoryId
}): ProtectionDetailViewModel | null {
	const area = buildProtectionAreaCard(input.knowledge, input.categoryId)

	if (!area.isApplicable && area.status === 'Missing') {
		return {
			area,
			coverageSummary: area.summary,
			policies: [],
			benefits: [],
			exclusions: [],
			timeline: [],
			claims: [],
			documents: [],
			recommendations: input.knowledge.coverageGaps
				.filter((gap) => gap.categoryId === input.categoryId)
				.map((gap) => ({
					id: gap.id,
					title: gap.recommendation,
					priority:
						gap.severity === 'critical'
							? ('high' as const)
							: ('medium' as const),
				})),
			askPrompt: `What ${area.shortName.toLowerCase()} insurance do I need?`,
		}
	}

	const policies = input.knowledge.policies.filter(
		(policy) => policy.categoryId === input.categoryId,
	)
	const policyIds = new Set(policies.map((policy) => policy.id))

	const policyCards: ProtectionPolicyCard[] = policies.map((policy) => {
		const memberCount = input.knowledge.members.filter(
			(member) => member.policyId === policy.id,
		).length

		return {
			id: policy.id,
			name: policy.productName ?? policy.policyNumber,
			insurer: policy.insurerName,
			coverageAmount: formatCoverageAmount(policy.sumInsured, policy.currency),
			statusLabel:
				policy.status === 'active'
					? policy.isExpiringSoon
						? 'Renewal due'
						: 'Active'
					: policy.status === 'expired' || policy.status === 'lapsed'
						? 'Expired'
						: 'Inactive',
			renewalLabel: formatRenewalLabel(
				policy.expiryDate,
				policy.renewalDate,
				policy.daysUntilExpiry,
			),
			memberCount,
		}
	})

	const benefits = input.knowledge.benefits
		.filter((item) => policyIds.has(item.policyId))
		.map((item) => item.description)
	const exclusions = input.knowledge.exclusions
		.filter((item) => policyIds.has(item.policyId))
		.map((item) => item.description)

	const timeline = input.knowledge.timeline
		.filter(
			(event) =>
				(event.policyId && policyIds.has(event.policyId)) ||
				(event.documentId &&
					input.knowledge.documents.some(
						(doc) =>
							doc.id === event.documentId &&
							doc.linkedPolicyIds.some((id) => policyIds.has(id)),
					)),
		)
		.slice(0, 8)
		.map((event) => ({
			id: event.id,
			title: humanizeTimelineTitle(event),
			dateLabel: formatActivityDate(event.date),
			tone:
				event.type === 'claim_settled' ||
				event.type === 'policy_renewed' ||
				event.type === 'premium_paid'
					? ('positive' as const)
					: event.type === 'policy_expired' || event.type === 'claim_filed'
						? ('attention' as const)
						: ('neutral' as const),
		}))

	const claims = input.knowledge.claims
		.filter((claim) => policyIds.has(claim.policyId))
		.map((claim) => ({
			id: claim.id,
			title: claim.claimNumber,
			status:
				claim.status === 'paid'
					? 'Approved'
					: claim.status.charAt(0).toUpperCase() + claim.status.slice(1),
			amount:
				claim.approvedAmount != null
					? formatCoverageAmount(claim.approvedAmount, 'INR')
					: claim.claimedAmount != null
						? formatCoverageAmount(claim.claimedAmount, 'INR')
						: null,
			dateLabel: claim.filedDate ? formatActivityDate(claim.filedDate) : null,
		}))

	const documents = input.knowledge.documents
		.filter((doc) => doc.linkedPolicyIds.some((id) => policyIds.has(id)))
		.map((doc) => ({
			id: doc.id,
			title: doc.fileName.replace(/\.pdf$/i, ''),
			dateLabel: formatActivityDate(doc.uploadedAt),
		}))

	const recommendations = [
		...input.knowledge.coverageGaps
			.filter((gap) => gap.categoryId === input.categoryId)
			.map((gap) => ({
				id: gap.id,
				title: gap.recommendation,
				priority:
					gap.severity === 'critical' ? ('high' as const) : ('medium' as const),
			})),
		...input.knowledge.recommendations
			.filter((rec) =>
				rec.evidenceIds.some((id) =>
					[...policyIds].some((policyId) => id.includes(policyId)),
				),
			)
			.map((rec) => ({
				id: rec.id,
				title: rec.text,
				priority: rec.priority,
			})),
	].slice(0, 5)

	const coverageSummary =
		area.status === 'Missing'
			? area.summary
			: `${area.coverageLabel}${area.coverageSubLabel ? ` · ${area.coverageSubLabel}` : ''}. ${area.summary}`

	return {
		area,
		coverageSummary,
		policies: policyCards,
		benefits,
		exclusions,
		timeline,
		claims,
		documents,
		recommendations,
		askPrompt: `Tell me about my ${area.shortName.toLowerCase()} insurance protection`,
	}
}

export function isPolicyCategoryId(value: string): value is PolicyCategoryId {
	return ALL_CATEGORY_IDS.includes(value as PolicyCategoryId)
}
