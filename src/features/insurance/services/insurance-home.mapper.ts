import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import { buildHealthGreeting } from '@/features/health/services/health-product.mapper'
import {
	consumerCoverageStatusLabel,
	consumerProtectionSummary,
	coverageStatusColor,
	deriveCategoryCoverageStatus,
	deriveConsumerProtectionStatus,
	formatCoverageAmount,
	type ConsumerCoverageStatus,
	type ConsumerProtectionStatus,
} from '@/features/insurance/services/insurance-consumer-status.service'

export interface InsuranceProtectionSnapshot {
	score: number | null
	protectionStatus: ConsumerProtectionStatus
	narrative: string
}

export interface InsuranceProtectionSummaryItem {
	id: string
	label: string
	value: string
	tone?: 'neutral' | 'attention'
}

export interface InsuranceCoverageCard {
	id: PolicyCategoryId
	emoji: string
	name: string
	status: ConsumerCoverageStatus
	statusLabel: string
	statusColor: string
	coverageAmount: string
	expiryLabel: string | null
	policyCount: number
}

export interface InsuranceActivityItem {
	id: string
	title: string
	dateLabel: string
	tone: 'neutral' | 'positive' | 'attention'
}

export interface InsuranceHomeRecommendation {
	id: string
	title: string
	priority: 'high' | 'medium' | 'low'
}

export interface InsuranceHomeViewModel {
	greeting: string
	protection: InsuranceProtectionSnapshot
	summary: InsuranceProtectionSummaryItem[]
	coverageCards: InsuranceCoverageCard[]
	recentActivity: InsuranceActivityItem[]
	recommendations: InsuranceHomeRecommendation[]
	hasPolicies: boolean
}

const CATEGORY_ORDER: PolicyCategoryId[] = [
	'health',
	'life_term',
	'motor',
	'home',
	'travel',
]

function formatActivityDate(date: string): string {
	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return ''
	}

	const now = Date.now()
	const diffDays = Math.floor((now - parsed) / (1000 * 60 * 60 * 24))

	if (diffDays < 0) {
		const futureDays = Math.abs(diffDays)

		if (futureDays <= 30) {
			return `In ${futureDays} day${futureDays === 1 ? '' : 's'}`
		}
	}

	if (diffDays === 0) {
		return 'Today'
	}

	if (diffDays === 1) {
		return 'Yesterday'
	}

	if (diffDays < 7) {
		return `${diffDays} days ago`
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function activityTone(type: string): InsuranceActivityItem['tone'] {
	if (
		type === 'claim_settled' ||
		type === 'policy_renewed' ||
		type === 'premium_paid' ||
		type === 'policy_purchased'
	) {
		return 'positive'
	}

	if (
		type === 'policy_expired' ||
		type === 'policy_closed' ||
		type === 'claim_filed'
	) {
		return 'attention'
	}

	return 'neutral'
}

function humanizeTimelineTitle(
	event: InsuranceKnowledge['timeline'][number],
): string {
	switch (event.type) {
		case 'policy_purchased':
			return event.title.includes('insurance')
				? event.title
				: `${event.title} added`
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
		case 'policy_closed':
			return `${event.title} closed`
		case 'document_imported':
			return event.title.replace(/\.pdf$/i, '')
		case 'endorsement':
			return `${event.title} updated`
		default:
			return event.title
	}
}

function buildExpiryLabel(
	categoryId: PolicyCategoryId,
	knowledge: InsuranceKnowledge,
): string | null {
	const categoryPolicies = knowledge.activePolicies.filter(
		(policy) => policy.categoryId === categoryId,
	)

	if (categoryPolicies.length === 0) {
		return null
	}

	const soonest = [...categoryPolicies]
		.filter((policy) => policy.daysUntilExpiry != null)
		.sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999))[0]

	if (!soonest || soonest.daysUntilExpiry == null) {
		return null
	}

	const days = soonest.daysUntilExpiry

	if (days < 0) {
		return 'Expired'
	}

	if (days === 0) {
		return 'Renews today'
	}

	if (days <= 30) {
		return `Renews in ${days} day${days === 1 ? '' : 's'}`
	}

	if (soonest.expiryDate) {
		return `Valid until ${new Date(soonest.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
	}

	return null
}

export function buildInsuranceHomeViewModel(input: {
	knowledge: InsuranceKnowledge
	memberName: string | null
}): InsuranceHomeViewModel {
	const { knowledge } = input
	const protectionStatus = deriveConsumerProtectionStatus(knowledge)
	const gapCategoryIds = new Set(
		knowledge.coverageGaps.map((gap) => gap.categoryId),
	)

	const coverageCards: InsuranceCoverageCard[] = CATEGORY_ORDER.map(
		(categoryId) => {
			const snapshot = knowledge.coverageByCategory.find(
				(item) => item.categoryId === categoryId,
			)
			const status = deriveCategoryCoverageStatus({
				activePolicyCount: snapshot?.activePolicyCount ?? 0,
				policyCount: snapshot?.policyCount ?? 0,
				totalSumInsured: snapshot?.totalSumInsured ?? null,
				categoryId,
				hasGap: gapCategoryIds.has(categoryId),
			})

			return {
				id: categoryId,
				emoji: snapshot?.emoji ?? '🛡️',
				name: snapshot?.name ?? categoryId,
				status,
				statusLabel: consumerCoverageStatusLabel(status),
				statusColor: coverageStatusColor(status),
				coverageAmount: formatCoverageAmount(
					snapshot?.totalSumInsured ?? null,
					snapshot?.currency ?? 'INR',
				),
				expiryLabel: buildExpiryLabel(categoryId, knowledge),
				policyCount: snapshot?.policyCount ?? 0,
			}
		},
	)

	const membersCovered = new Set(
		knowledge.members.map((member) => member.name.trim().toLowerCase()),
	).size

	const openClaims = knowledge.claims.filter(
		(claim) =>
			claim.status === 'filed' ||
			claim.status === 'processing' ||
			claim.status === 'approved',
	).length

	const needingAttention = knowledge.policies.filter(
		(policy) =>
			policy.isExpiringSoon ||
			policy.needsReprocess ||
			policy.status === 'expired' ||
			policy.status === 'lapsed',
	).length

	const summary: InsuranceProtectionSummaryItem[] = [
		{
			id: 'active-policies',
			label: 'Active policies',
			value: String(knowledge.activePolicies.length),
		},
		{
			id: 'members-covered',
			label: 'Family covered',
			value: membersCovered > 0 ? String(membersCovered) : '—',
		},
		{
			id: 'renewals',
			label: 'Upcoming renewals',
			value: String(knowledge.expiringPolicies.length),
			tone: knowledge.expiringPolicies.length > 0 ? 'attention' : 'neutral',
		},
		{
			id: 'open-claims',
			label: 'Open claims',
			value: String(openClaims),
			tone: openClaims > 0 ? 'attention' : 'neutral',
		},
		{
			id: 'attention',
			label: 'Needs attention',
			value: String(needingAttention),
			tone: needingAttention > 0 ? 'attention' : 'neutral',
		},
	]

	const recentActivity: InsuranceActivityItem[] = knowledge.timeline
		.slice(0, 6)
		.map((event) => ({
			id: event.id,
			title: humanizeTimelineTitle(event),
			dateLabel: formatActivityDate(event.date),
			tone: activityTone(event.type),
		}))

	const recommendations: InsuranceHomeRecommendation[] =
		knowledge.recommendations.slice(0, 5).map((item) => ({
			id: item.id,
			title: item.text,
			priority: item.priority,
		}))

	return {
		greeting: buildHealthGreeting(input.memberName),
		protection: {
			score: knowledge.protectionScore,
			protectionStatus,
			narrative: consumerProtectionSummary(protectionStatus),
		},
		summary,
		coverageCards,
		recentActivity,
		recommendations,
		hasPolicies: knowledge.policies.some((policy) => policy.isDisplayReady),
	}
}
