import type {
	InsuranceKnowledge,
	InsuranceKnowledgeClaim,
	InsuranceKnowledgePolicy,
	InsuranceKnowledgeRenewal,
	InsuranceKnowledgeTimelineEvent,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import { getCategoryMeta } from '@/features/insurance-knowledge/graph/policy-categories'
import { formatCoverageAmount } from '@/features/insurance/services/insurance-consumer-status.service'

export type TimelineConsumerEventKind =
	| 'policy_purchased'
	| 'policy_renewed'
	| 'policy_expired'
	| 'policy_cancelled'
	| 'coverage_increased'
	| 'coverage_reduced'
	| 'nominee_changed'
	| 'vehicle_purchased'
	| 'vehicle_sold'
	| 'home_purchased'
	| 'claim_submitted'
	| 'claim_approved'
	| 'claim_settled'
	| 'claim_rejected'
	| 'member_covered'
	| 'travel_purchased'
	| 'milestone'

export type TimelineFilterId =
	PolicyCategoryId | 'claims' | 'renewals' | 'coverage'

export interface TimelineCardViewModel {
	id: string
	kind: TimelineConsumerEventKind
	title: string
	subtitle: string | null
	detail: string | null
	coverageChange: { from: string; to: string } | null
	highlights: string[]
	amountLabel: string | null
	memberName: string | null
	categoryId: PolicyCategoryId | null
	categoryEmoji: string
	categoryColor: string
	date: string
	monthLabel: string
	year: number
	monthKey: string
	isMilestone: boolean
	milestoneLabel: string | null
	thumbnailDocumentId: string | null
	policyId: string | null
	claimId: string | null
	filterTags: TimelineFilterId[]
}

export interface TimelineYearSummary {
	year: number
	protectionScore: string
	policiesAdded: number
	renewals: number
	claims: number
	coverageGrowthLabel: string | null
}

export interface TimelineMilestoneViewModel {
	id: string
	label: string
	year: number
	date: string
}

export interface TimelineMonthGroup {
	id: string
	label: string
	year: number
	cards: TimelineCardViewModel[]
}

export interface TimelineYearGroup {
	year: number
	summary: TimelineYearSummary
	story: string
	milestones: TimelineMilestoneViewModel[]
	months: TimelineMonthGroup[]
}

export interface InsuranceTimelineViewModel {
	headline: string
	subtitle: string
	yearGroups: TimelineYearGroup[]
	totalEvents: number
	milestones: TimelineMilestoneViewModel[]
}

const INTERNAL_EVENT_TYPES = new Set<InsuranceKnowledgeTimelineEvent['type']>([
	'document_imported',
	'premium_paid',
])

const CATEGORY_SHORT: Record<PolicyCategoryId, string> = {
	health: 'Health',
	life_term: 'Life',
	motor: 'Vehicle',
	home: 'Home',
	travel: 'Travel',
}

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

function formatMonthYear(date: string): string {
	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return ''
	}

	const value = new Date(parsed)

	return `${MONTH_NAMES[value.getMonth()]} ${value.getFullYear()}`
}

function getYearMonthKey(date: string): { year: number; monthKey: string } {
	const parsed = Date.parse(date)
	const value = Number.isNaN(parsed) ? new Date() : new Date(parsed)

	return {
		year: value.getFullYear(),
		monthKey: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`,
	}
}

function resolvePolicy(
	knowledge: InsuranceKnowledge,
	policyId: string | undefined,
): InsuranceKnowledgePolicy | null {
	if (!policyId) {
		return null
	}

	return knowledge.policies.find((policy) => policy.id === policyId) ?? null
}

function resolveClaim(
	knowledge: InsuranceKnowledge,
	claimId: string | undefined,
): InsuranceKnowledgeClaim | null {
	if (!claimId) {
		return null
	}

	return knowledge.claims.find((claim) => claim.id === claimId) ?? null
}

function resolvePolicyMembers(
	knowledge: InsuranceKnowledge,
	policyId: string,
): string[] {
	return knowledge.members
		.filter((member) => member.policyId === policyId)
		.map((member) => member.name)
}

function resolveClaimMember(
	knowledge: InsuranceKnowledge,
	claim: InsuranceKnowledgeClaim,
): string | null {
	const members = resolvePolicyMembers(knowledge, claim.policyId)

	return members[0] ?? null
}

function buildFilterTags(
	categoryId: PolicyCategoryId | null,
	kind: TimelineConsumerEventKind,
): TimelineFilterId[] {
	const tags: TimelineFilterId[] = []

	if (categoryId) {
		tags.push(categoryId)
	}

	if (
		kind === 'claim_submitted' ||
		kind === 'claim_approved' ||
		kind === 'claim_settled' ||
		kind === 'claim_rejected'
	) {
		tags.push('claims')
	}

	if (
		kind === 'policy_renewed' ||
		kind === 'coverage_increased' ||
		kind === 'coverage_reduced'
	) {
		tags.push('renewals')
	}

	if (
		kind === 'coverage_increased' ||
		kind === 'coverage_reduced' ||
		kind === 'policy_purchased' ||
		kind === 'vehicle_purchased' ||
		kind === 'home_purchased' ||
		kind === 'travel_purchased'
	) {
		tags.push('coverage')
	}

	return tags
}

function findRenewalForEvent(
	knowledge: InsuranceKnowledge,
	policyId: string,
	date: string,
): InsuranceKnowledgeRenewal | null {
	return (
		knowledge.renewals.find(
			(renewal) =>
				renewal.policyId === policyId &&
				Math.abs(Date.parse(renewal.renewalDate) - Date.parse(date)) <
					1000 * 60 * 60 * 24 * 14,
		) ?? null
	)
}

function estimateCoverageChange(
	policy: InsuranceKnowledgePolicy,
	renewal: InsuranceKnowledgeRenewal,
): { from: string; to: string; increased: boolean } | null {
	if (
		policy.sumInsured == null ||
		renewal.previousPremium == null ||
		renewal.newPremium == null ||
		renewal.newPremium <= 0
	) {
		return null
	}

	const ratio = renewal.previousPremium / renewal.newPremium
	const previousCoverage = Math.round(policy.sumInsured * ratio)

	if (
		Math.abs(previousCoverage - policy.sumInsured) <
		policy.sumInsured * 0.05
	) {
		return null
	}

	return {
		from: formatCoverageAmount(previousCoverage, policy.currency),
		to: formatCoverageAmount(policy.sumInsured, policy.currency),
		increased: policy.sumInsured > previousCoverage,
	}
}

function buildHighlights(
	knowledge: InsuranceKnowledge,
	policyId: string,
): string[] {
	return knowledge.benefits
		.filter((benefit) => benefit.policyId === policyId)
		.map((benefit) => benefit.description)
		.slice(0, 3)
}

function resolveThumbnail(
	knowledge: InsuranceKnowledge,
	policyId: string | null,
): string | null {
	if (!policyId) {
		return null
	}

	const policy = resolvePolicy(knowledge, policyId)

	return policy?.sourceDocumentIds[0] ?? null
}

function mapPurchasedEvent(
	knowledge: InsuranceKnowledge,
	event: InsuranceKnowledgeTimelineEvent,
	policy: InsuranceKnowledgePolicy,
): TimelineCardViewModel {
	const meta = getCategoryMeta(policy.categoryId)
	const members = resolvePolicyMembers(knowledge, policy.id)
	const highlights = buildHighlights(knowledge, policy.id)
	const { year, monthKey } = getYearMonthKey(event.date)

	let kind: TimelineConsumerEventKind = 'policy_purchased'
	let title = `Purchased ${policy.insurerName} ${CATEGORY_SHORT[policy.categoryId]} Insurance`

	if (policy.categoryId === 'motor' && policy.productName) {
		kind = 'vehicle_purchased'
		title = `Purchased ${policy.productName} Insurance`
	} else if (policy.categoryId === 'travel') {
		kind = 'travel_purchased'
		title = `Purchased ${policy.insurerName} Travel Insurance`
	} else if (policy.categoryId === 'home') {
		kind = 'home_purchased'
		title = `Purchased ${policy.insurerName} Home Insurance`
	}

	return {
		id: event.id,
		kind,
		title,
		subtitle: policy.insurerName,
		detail:
			policy.sumInsured != null
				? formatCoverageAmount(policy.sumInsured, policy.currency)
				: null,
		coverageChange: null,
		highlights,
		amountLabel: null,
		memberName: members[0] ?? null,
		categoryId: policy.categoryId,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		date: event.date,
		monthLabel: formatMonthYear(event.date),
		year,
		monthKey,
		isMilestone: false,
		milestoneLabel: null,
		thumbnailDocumentId: resolveThumbnail(knowledge, policy.id),
		policyId: policy.id,
		claimId: null,
		filterTags: buildFilterTags(policy.categoryId, kind),
	}
}

function mapRenewedEvent(
	knowledge: InsuranceKnowledge,
	event: InsuranceKnowledgeTimelineEvent,
	policy: InsuranceKnowledgePolicy,
): TimelineCardViewModel {
	const meta = getCategoryMeta(policy.categoryId)
	const renewal = findRenewalForEvent(knowledge, policy.id, event.date)
	const coverageDelta = renewal ? estimateCoverageChange(policy, renewal) : null
	const { year, monthKey } = getYearMonthKey(event.date)

	let kind: TimelineConsumerEventKind = 'policy_renewed'
	let title = `Renewed ${policy.insurerName} ${CATEGORY_SHORT[policy.categoryId]} Insurance`

	if (coverageDelta?.increased) {
		kind = 'coverage_increased'
		title = `Renewed ${policy.insurerName} ${CATEGORY_SHORT[policy.categoryId]} Insurance`
	} else if (coverageDelta && !coverageDelta.increased) {
		kind = 'coverage_reduced'
	}

	return {
		id: event.id,
		kind,
		title,
		subtitle: coverageDelta ? 'Coverage changed' : null,
		detail: null,
		coverageChange: coverageDelta
			? { from: coverageDelta.from, to: coverageDelta.to }
			: null,
		highlights: [],
		amountLabel: null,
		memberName: null,
		categoryId: policy.categoryId,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		date: event.date,
		monthLabel: formatMonthYear(event.date),
		year,
		monthKey,
		isMilestone: false,
		milestoneLabel: null,
		thumbnailDocumentId: resolveThumbnail(knowledge, policy.id),
		policyId: policy.id,
		claimId: null,
		filterTags: buildFilterTags(policy.categoryId, kind),
	}
}

function mapClaimFiledEvent(
	knowledge: InsuranceKnowledge,
	event: InsuranceKnowledgeTimelineEvent,
	policy: InsuranceKnowledgePolicy,
	claim: InsuranceKnowledgeClaim,
): TimelineCardViewModel {
	const meta = getCategoryMeta(policy.categoryId)
	const member = resolveClaimMember(knowledge, claim)
	const { year, monthKey } = getYearMonthKey(event.date)

	const title =
		policy.categoryId === 'health'
			? member
				? `${member} Health Claim`
				: 'Health Claim'
			: policy.categoryId === 'motor' && policy.productName
				? `${policy.productName} Claim`
				: 'Claim Submitted'

	return {
		id: event.id,
		kind: 'claim_submitted',
		title,
		subtitle: policy.insurerName,
		detail: null,
		coverageChange: null,
		highlights: [],
		amountLabel:
			claim.claimedAmount != null
				? `${formatCoverageAmount(claim.claimedAmount, policy.currency)} Claimed`
				: null,
		memberName: member,
		categoryId: policy.categoryId,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		date: event.date,
		monthLabel: formatMonthYear(event.date),
		year,
		monthKey,
		isMilestone: false,
		milestoneLabel: null,
		thumbnailDocumentId: null,
		policyId: policy.id,
		claimId: claim.id,
		filterTags: buildFilterTags(policy.categoryId, 'claim_submitted'),
	}
}

function mapClaimSettledEvent(
	knowledge: InsuranceKnowledge,
	event: InsuranceKnowledgeTimelineEvent,
	policy: InsuranceKnowledgePolicy,
	claim: InsuranceKnowledgeClaim,
): TimelineCardViewModel {
	const meta = getCategoryMeta(policy.categoryId)
	const member = resolveClaimMember(knowledge, claim)
	const { year, monthKey } = getYearMonthKey(event.date)

	const title =
		policy.categoryId === 'health'
			? member
				? `${member} Health Claim`
				: 'Health Claim'
			: policy.categoryId === 'motor' && policy.productName
				? `${policy.productName} Claim`
				: 'Claim Settled'

	const amount = claim.approvedAmount ?? claim.claimedAmount

	return {
		id: event.id,
		kind: 'claim_settled',
		title,
		subtitle: 'Settled',
		detail: null,
		coverageChange: null,
		highlights: [],
		amountLabel:
			amount != null
				? `${formatCoverageAmount(amount, policy.currency)} Settled`
				: 'Settled',
		memberName: member,
		categoryId: policy.categoryId,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		date: event.date,
		monthLabel: formatMonthYear(event.date),
		year,
		monthKey,
		isMilestone: false,
		milestoneLabel: null,
		thumbnailDocumentId: null,
		policyId: policy.id,
		claimId: claim.id,
		filterTags: buildFilterTags(policy.categoryId, 'claim_settled'),
	}
}

function mapExpiredEvent(
	knowledge: InsuranceKnowledge,
	event: InsuranceKnowledgeTimelineEvent,
	policy: InsuranceKnowledgePolicy,
): TimelineCardViewModel {
	const meta = getCategoryMeta(policy.categoryId)
	const { year, monthKey } = getYearMonthKey(event.date)
	const isCancelled = event.type === 'policy_closed'

	return {
		id: event.id,
		kind: isCancelled ? 'policy_cancelled' : 'policy_expired',
		title: isCancelled
			? `${policy.insurerName} ${CATEGORY_SHORT[policy.categoryId]} Cancelled`
			: `${policy.insurerName} ${CATEGORY_SHORT[policy.categoryId]} Expired`,
		subtitle: policy.productName,
		detail: null,
		coverageChange: null,
		highlights: [],
		amountLabel: null,
		memberName: null,
		categoryId: policy.categoryId,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		date: event.date,
		monthLabel: formatMonthYear(event.date),
		year,
		monthKey,
		isMilestone: false,
		milestoneLabel: null,
		thumbnailDocumentId: resolveThumbnail(knowledge, policy.id),
		policyId: policy.id,
		claimId: null,
		filterTags: buildFilterTags(
			policy.categoryId,
			isCancelled ? 'policy_cancelled' : 'policy_expired',
		),
	}
}

function mapEndorsementEvent(
	knowledge: InsuranceKnowledge,
	event: InsuranceKnowledgeTimelineEvent,
	policy: InsuranceKnowledgePolicy,
): TimelineCardViewModel {
	const meta = getCategoryMeta(policy.categoryId)
	const { year, monthKey } = getYearMonthKey(event.date)

	return {
		id: event.id,
		kind: 'nominee_changed',
		title: 'Nominee Updated',
		subtitle: policy.insurerName,
		detail: event.description,
		coverageChange: null,
		highlights: [],
		amountLabel: null,
		memberName: null,
		categoryId: policy.categoryId,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		date: event.date,
		monthLabel: formatMonthYear(event.date),
		year,
		monthKey,
		isMilestone: false,
		milestoneLabel: null,
		thumbnailDocumentId: resolveThumbnail(knowledge, policy.id),
		policyId: policy.id,
		claimId: null,
		filterTags: buildFilterTags(policy.categoryId, 'nominee_changed'),
	}
}

function mapTimelineEvent(
	knowledge: InsuranceKnowledge,
	event: InsuranceKnowledgeTimelineEvent,
): TimelineCardViewModel | null {
	if (INTERNAL_EVENT_TYPES.has(event.type)) {
		return null
	}

	const policy = resolvePolicy(knowledge, event.policyId)
	const claim = resolveClaim(knowledge, event.claimId)

	switch (event.type) {
		case 'policy_purchased':
			return policy ? mapPurchasedEvent(knowledge, event, policy) : null
		case 'policy_renewed':
			return policy ? mapRenewedEvent(knowledge, event, policy) : null
		case 'claim_filed':
			return policy && claim
				? mapClaimFiledEvent(knowledge, event, policy, claim)
				: null
		case 'claim_settled':
			return policy && claim
				? mapClaimSettledEvent(knowledge, event, policy, claim)
				: null
		case 'policy_expired':
		case 'policy_closed':
			return policy ? mapExpiredEvent(knowledge, event, policy) : null
		case 'endorsement':
			return policy ? mapEndorsementEvent(knowledge, event, policy) : null
		default:
			return null
	}
}

function buildSupplementalClaimEvents(
	knowledge: InsuranceKnowledge,
	existingIds: Set<string>,
): TimelineCardViewModel[] {
	const cards: TimelineCardViewModel[] = []

	for (const claim of knowledge.claims) {
		const policy = resolvePolicy(knowledge, claim.policyId)

		if (!policy || !claim.filedDate) {
			continue
		}

		if (claim.status === 'rejected') {
			const id = `supplement-claim-rejected-${claim.id}`

			if (existingIds.has(id)) {
				continue
			}

			const meta = getCategoryMeta(policy.categoryId)
			const member = resolveClaimMember(knowledge, claim)
			const { year, monthKey } = getYearMonthKey(claim.filedDate)

			cards.push({
				id,
				kind: 'claim_rejected',
				title: member ? `${member} Claim Declined` : 'Claim Declined',
				subtitle: policy.insurerName,
				detail: null,
				coverageChange: null,
				highlights: [],
				amountLabel:
					claim.claimedAmount != null
						? `${formatCoverageAmount(claim.claimedAmount, policy.currency)} Claimed`
						: null,
				memberName: member,
				categoryId: policy.categoryId,
				categoryEmoji: meta.emoji,
				categoryColor: meta.color,
				date: claim.settledDate ?? claim.filedDate,
				monthLabel: formatMonthYear(claim.settledDate ?? claim.filedDate),
				year,
				monthKey,
				isMilestone: false,
				milestoneLabel: null,
				thumbnailDocumentId: null,
				policyId: policy.id,
				claimId: claim.id,
				filterTags: buildFilterTags(policy.categoryId, 'claim_rejected'),
			})
		}

		if (claim.status === 'approved' && claim.filedDate) {
			const id = `supplement-claim-approved-${claim.id}`

			if (existingIds.has(id)) {
				continue
			}

			const meta = getCategoryMeta(policy.categoryId)
			const member = resolveClaimMember(knowledge, claim)
			const { year, monthKey } = getYearMonthKey(claim.filedDate)

			cards.push({
				id,
				kind: 'claim_approved',
				title: member ? `${member} Claim Approved` : 'Claim Approved',
				subtitle: policy.insurerName,
				detail: null,
				coverageChange: null,
				highlights: [],
				amountLabel:
					claim.approvedAmount != null
						? `${formatCoverageAmount(claim.approvedAmount, policy.currency)} Approved`
						: null,
				memberName: member,
				categoryId: policy.categoryId,
				categoryEmoji: meta.emoji,
				categoryColor: meta.color,
				date: claim.filedDate,
				monthLabel: formatMonthYear(claim.filedDate),
				year,
				monthKey,
				isMilestone: false,
				milestoneLabel: null,
				thumbnailDocumentId: null,
				policyId: policy.id,
				claimId: claim.id,
				filterTags: buildFilterTags(policy.categoryId, 'claim_approved'),
			})
		}
	}

	return cards
}

function detectMilestones(
	cards: TimelineCardViewModel[],
	knowledge: InsuranceKnowledge,
): TimelineMilestoneViewModel[] {
	const milestones: TimelineMilestoneViewModel[] = []
	const seen = new Set<string>()

	function addMilestone(
		id: string,
		label: string,
		card: TimelineCardViewModel,
	) {
		if (seen.has(id)) {
			return
		}

		seen.add(id)
		milestones.push({
			id,
			label,
			year: card.year,
			date: card.date,
		})
	}

	let runningCoverage = 0
	let firstClaimSettled = false

	const sorted = [...cards].sort(
		(a, b) => Date.parse(a.date) - Date.parse(b.date),
	)

	for (const card of sorted) {
		if (
			card.kind === 'policy_purchased' ||
			card.kind === 'vehicle_purchased' ||
			card.kind === 'home_purchased' ||
			card.kind === 'travel_purchased'
		) {
			if (card.categoryId === 'health') {
				addMilestone('first-health', 'First Health Insurance', card)
			}

			if (card.categoryId === 'home') {
				addMilestone('first-home', 'First Home Insurance', card)
			}

			if (card.categoryId === 'motor') {
				addMilestone('first-vehicle', 'Vehicle Purchased', card)
			}
		}

		if (card.kind === 'claim_settled' && !firstClaimSettled) {
			firstClaimSettled = true
			addMilestone('first-claim-settled', 'First Claim Settled', card)
		}

		if (card.detail && card.kind.includes('purchased')) {
			const amount = parseCoverageFromLabel(card.detail)

			if (amount != null) {
				runningCoverage += amount

				if (runningCoverage >= 10000000) {
					addMilestone('coverage-1cr', 'Coverage exceeded ₹1 Crore', card)
				}
			}
		}
	}

	const healthMemberCount = [
		...new Set(
			knowledge.members
				.filter((member) => {
					const policy = resolvePolicy(knowledge, member.policyId)
					return policy?.categoryId === 'health'
				})
				.map((member) => member.name),
		),
	].length

	if (healthMemberCount >= 3) {
		const familyCard = sorted.find(
			(card) => card.categoryId === 'health' && card.kind.includes('purchased'),
		)

		if (familyCard) {
			addMilestone('family-covered', 'Entire Family Covered', familyCard)
		}
	}

	return milestones.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

function parseCoverageFromLabel(label: string): number | null {
	const match = label.match(/₹([\d.]+)\s*(L|Cr)?/)

	if (!match?.[1]) {
		return null
	}

	const value = Number.parseFloat(match[1])
	const unit = match[2]

	if (unit === 'Cr') {
		return value * 10000000
	}

	if (unit === 'L') {
		return value * 100000
	}

	return value
}

function buildYearSummary(
	year: number,
	cards: TimelineCardViewModel[],
	knowledge: InsuranceKnowledge,
	isCurrentYear: boolean,
): TimelineYearSummary {
	const yearCards = cards.filter((card) => card.year === year)

	const policiesAdded = yearCards.filter(
		(card) =>
			card.kind === 'policy_purchased' ||
			card.kind === 'vehicle_purchased' ||
			card.kind === 'home_purchased' ||
			card.kind === 'travel_purchased',
	).length

	const renewals = yearCards.filter(
		(card) =>
			card.kind === 'policy_renewed' || card.kind === 'coverage_increased',
	).length

	const claims = yearCards.filter((card) =>
		card.kind.startsWith('claim_'),
	).length

	let coverageGrowth = 0
	const currency = knowledge.policies[0]?.currency ?? 'INR'

	for (const card of yearCards) {
		if (card.coverageChange) {
			const from = parseCoverageFromLabel(card.coverageChange.from)
			const to = parseCoverageFromLabel(card.coverageChange.to)

			if (from != null && to != null) {
				coverageGrowth += to - from
			}
		} else if (
			card.kind === 'vehicle_purchased' ||
			card.kind === 'policy_purchased' ||
			card.kind === 'home_purchased' ||
			card.kind === 'travel_purchased'
		) {
			const added = card.detail ? parseCoverageFromLabel(card.detail) : null

			if (added != null) {
				coverageGrowth += added
			}
		}
	}

	return {
		year,
		protectionScore:
			isCurrentYear && knowledge.protectionScore != null
				? String(Math.round(knowledge.protectionScore))
				: '—',
		policiesAdded,
		renewals,
		claims,
		coverageGrowthLabel:
			coverageGrowth > 0
				? `+${formatCoverageAmount(coverageGrowth, currency)}`
				: coverageGrowth < 0
					? formatCoverageAmount(coverageGrowth, currency)
					: null,
	}
}

function buildYearStory(
	year: number,
	cards: TimelineCardViewModel[],
	summary: TimelineYearSummary,
): string {
	const yearCards = [...cards]
		.filter((card) => card.year === year)
		.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))

	if (yearCards.length === 0) {
		return `In ${year}, your insurance story was just beginning.`
	}

	const lines: string[] = [`In ${year} you shaped your family's protection.`]

	const coverageUpgrade = yearCards.find(
		(card) => card.kind === 'coverage_increased' && card.coverageChange,
	)

	if (coverageUpgrade?.coverageChange) {
		lines.push(
			`You upgraded cover from ${coverageUpgrade.coverageChange.from} to ${coverageUpgrade.coverageChange.to}.`,
		)
	}

	const vehicleAdded = yearCards.find(
		(card) => card.kind === 'vehicle_purchased',
	)

	if (vehicleAdded) {
		lines.push(
			`You added vehicle insurance for ${vehicleAdded.title.replace('Purchased ', '').replace(' Insurance', '')}.`,
		)
	}

	const claimSettled = yearCards.find((card) => card.kind === 'claim_settled')

	if (claimSettled) {
		const who = claimSettled.memberName ?? 'Your family'
		lines.push(
			`${who}'s ${claimSettled.amountLabel?.includes('Settled') ? claimSettled.amountLabel.replace(' Settled', '') : 'hospitalization'} claim was successfully settled.`,
		)
	} else if (summary.policiesAdded > 0 && summary.claims === 0) {
		lines.push('A quiet year — no claims, just growing protection.')
	}

	if (summary.policiesAdded > 1) {
		lines.push(
			`You added ${summary.policiesAdded} new policies to your archive.`,
		)
	}

	return lines.slice(0, 4).join(' ')
}

export function buildTimelineCards(
	knowledge: InsuranceKnowledge,
): TimelineCardViewModel[] {
	const fromTimeline = knowledge.timeline
		.map((event) => mapTimelineEvent(knowledge, event))
		.filter((card): card is TimelineCardViewModel => card != null)

	const existingIds = new Set(fromTimeline.map((card) => card.id))
	const supplemental = buildSupplementalClaimEvents(knowledge, existingIds)

	const allCards = [...fromTimeline, ...supplemental].sort(
		(a, b) => Date.parse(b.date) - Date.parse(a.date),
	)

	const milestones = detectMilestones(allCards, knowledge)

	for (const card of allCards) {
		for (const milestone of milestones) {
			if (
				Math.abs(Date.parse(card.date) - Date.parse(milestone.date)) <
				1000 * 60 * 60 * 24 * 3
			) {
				card.isMilestone = true
				card.milestoneLabel = milestone.label
				break
			}
		}
	}

	return allCards
}

export function buildInsuranceTimelineViewModel(
	knowledge: InsuranceKnowledge,
): InsuranceTimelineViewModel {
	const cards = buildTimelineCards(knowledge)
	const milestones = detectMilestones(cards, knowledge)
	const currentYear = new Date().getFullYear()

	const years = [...new Set(cards.map((card) => card.year))].sort(
		(a, b) => b - a,
	)

	const yearGroups: TimelineYearGroup[] = years.map((year) => {
		const yearCards = cards.filter((card) => card.year === year)
		const summary = buildYearSummary(
			year,
			cards,
			knowledge,
			year === currentYear,
		)
		const story = buildYearStory(year, cards, summary)
		const yearMilestones = milestones.filter(
			(milestone) => milestone.year === year,
		)

		const monthKeys = [...new Set(yearCards.map((card) => card.monthKey))].sort(
			(a, b) => b.localeCompare(a),
		)

		const months: TimelineMonthGroup[] = monthKeys.map((monthKey) => ({
			id: monthKey,
			label:
				yearCards.find((card) => card.monthKey === monthKey)?.monthLabel ??
				monthKey,
			year,
			cards: yearCards
				.filter((card) => card.monthKey === monthKey)
				.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
		}))

		return {
			year,
			summary,
			story,
			milestones: yearMilestones,
			months,
		}
	})

	return {
		headline: 'Your insurance story',
		subtitle:
			cards.length === 0
				? 'Your protection journey will unfold here.'
				: `${cards.length} moment${cards.length === 1 ? '' : 's'} in your family's protection`,
		yearGroups,
		totalEvents: cards.length,
		milestones,
	}
}

export interface TimelineSearchIntent {
	categoryFilters: PolicyCategoryId[]
	topicFilters: Array<'claims' | 'renewals' | 'coverage'>
	yearFilter: number | null
	renewalsOnly: boolean
	vehicleHistory: boolean
	coverageUpgrades: boolean
}

export function parseTimelineSearchIntent(query: string): TimelineSearchIntent {
	const normalized = query.trim().toLowerCase()

	const intent: TimelineSearchIntent = {
		categoryFilters: [],
		topicFilters: [],
		yearFilter: null,
		renewalsOnly: false,
		vehicleHistory: false,
		coverageUpgrades: false,
	}

	if (!normalized) {
		return intent
	}

	if (normalized.includes('health')) {
		intent.categoryFilters.push('health')
	}

	if (normalized.includes('vehicle') || normalized.includes('motor')) {
		intent.categoryFilters.push('motor')
		intent.vehicleHistory = true
	}

	if (normalized.includes('life')) {
		intent.categoryFilters.push('life_term')
	}

	if (normalized.includes('home')) {
		intent.categoryFilters.push('home')
	}

	if (normalized.includes('travel')) {
		intent.categoryFilters.push('travel')
	}

	if (normalized.includes('claim')) {
		intent.topicFilters.push('claims')
	}

	if (normalized.includes('renewal')) {
		intent.topicFilters.push('renewals')
		intent.renewalsOnly = true
	}

	if (
		normalized.includes('coverage upgrade') ||
		normalized.includes('coverage increased')
	) {
		intent.topicFilters.push('coverage')
		intent.coverageUpgrades = true
	}

	const yearMatch = normalized.match(/\b(20\d{2})\b/)

	if (yearMatch?.[1]) {
		intent.yearFilter = Number.parseInt(yearMatch[1], 10)
	}

	return intent
}

export function scoreTimelineSearchRelevance(
	card: TimelineCardViewModel,
	query: string,
): number {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return 1
	}

	const intent = parseTimelineSearchIntent(query)
	let score = 0

	const haystack = [
		card.title,
		card.subtitle ?? '',
		card.detail ?? '',
		card.memberName ?? '',
		card.amountLabel ?? '',
		card.milestoneLabel ?? '',
		...card.highlights,
	]
		.join(' ')
		.toLowerCase()

	for (const token of normalized.split(/\s+/).filter(Boolean)) {
		if (token.length >= 2 && haystack.includes(token)) {
			score += 12
		}
	}

	if (
		intent.categoryFilters.length > 0 &&
		card.categoryId &&
		intent.categoryFilters.includes(card.categoryId)
	) {
		score += 40
	}

	for (const topic of intent.topicFilters) {
		if (card.filterTags.includes(topic)) {
			score += 35
		}
	}

	if (intent.renewalsOnly && card.kind === 'policy_renewed') {
		score += 30
	}

	if (intent.coverageUpgrades && card.kind === 'coverage_increased') {
		score += 40
	}

	if (intent.vehicleHistory && card.categoryId === 'motor') {
		score += 35
	}

	if (intent.yearFilter != null && card.year === intent.yearFilter) {
		score += 45
	}

	if (
		intent.categoryFilters.length > 0 &&
		card.categoryId &&
		!intent.categoryFilters.includes(card.categoryId)
	) {
		return 0
	}

	if (
		intent.topicFilters.length > 0 &&
		!intent.topicFilters.some((topic) => card.filterTags.includes(topic))
	) {
		return 0
	}

	return score
}

export function filterTimelineCards(input: {
	cards: TimelineCardViewModel[]
	query: string
	categoryFilters: TimelineFilterId[]
}): TimelineCardViewModel[] {
	let results = [...input.cards]

	if (input.categoryFilters.length > 0) {
		results = results.filter((card) =>
			input.categoryFilters.some((filter) => card.filterTags.includes(filter)),
		)
	}

	const normalized = input.query.trim()

	if (normalized) {
		results = results
			.map((card) => ({
				card,
				score: scoreTimelineSearchRelevance(card, normalized),
			}))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((item) => item.card)
	}

	return results
}

export function rebuildTimelineGroupsFromCards(
	cards: TimelineCardViewModel[],
	knowledge: InsuranceKnowledge,
): TimelineYearGroup[] {
	const currentYear = new Date().getFullYear()
	const years = [...new Set(cards.map((card) => card.year))].sort(
		(a, b) => b - a,
	)

	return years.map((year) => {
		const yearCards = cards.filter((card) => card.year === year)
		const summary = buildYearSummary(
			year,
			cards,
			knowledge,
			year === currentYear,
		)
		const story = buildYearStory(year, cards, summary)
		const milestones = detectMilestones(cards, knowledge).filter(
			(milestone) => milestone.year === year,
		)

		const monthKeys = [...new Set(yearCards.map((card) => card.monthKey))].sort(
			(a, b) => b.localeCompare(a),
		)

		return {
			year,
			summary,
			story,
			milestones,
			months: monthKeys.map((monthKey) => ({
				id: monthKey,
				label:
					yearCards.find((card) => card.monthKey === monthKey)?.monthLabel ??
					monthKey,
				year,
				cards: yearCards
					.filter((card) => card.monthKey === monthKey)
					.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
			})),
		}
	})
}
