import type {
	InsuranceKnowledge,
	InsuranceKnowledgeDocumentRef,
	InsuranceKnowledgePolicy,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import { getCategoryMeta } from '@/features/insurance-knowledge/graph/policy-categories'
import { formatCoverageAmount } from '@/features/insurance/services/insurance-consumer-status.service'
import type { InsuranceActivityItem } from '@/features/insurance/services/insurance-home.mapper'

export type PolicyConsumerStatus =
	'Active' | 'Expired' | 'Expiring Soon' | 'Cancelled' | 'Lapsed'

export type PolicyCategoryFilterId = PolicyCategoryId | 'personal_accident'

export type PolicyStatusFilterId =
	'active' | 'expired' | 'expiring_soon' | 'cancelled'

export type PolicyGroupById =
	'category' | 'expiry' | 'insurer' | 'member' | 'default'

export interface PolicyCardViewModel {
	id: string
	name: string
	categoryLabel: string
	categoryEmoji: string
	categoryColor: string
	categoryId: PolicyCategoryId
	insurer: string
	policyNumberMasked: string
	coverageLabel: string
	premiumLabel: string | null
	renewalLabel: string | null
	coveredMembers: string[]
	status: PolicyConsumerStatus
	statusColor: string
	assetLabel: string | null
	thumbnailDocumentId: string | null
	sortDate: string
	premiumAmount: number | null
}

export interface PolicyGroupViewModel {
	id: string
	title: string
	subtitle: string | null
	policies: PolicyCardViewModel[]
}

export interface PoliciesListViewModel {
	headline: string
	subtitle: string
	policyCards: PolicyCardViewModel[]
	totalCount: number
}

export interface PolicyDocumentViewModel {
	id: string
	title: string
	kindLabel: string
	dateLabel: string
	sortDate: string
}

export interface PolicyDetailViewModel {
	id: string
	name: string
	categoryLabel: string
	categoryEmoji: string
	categoryColor: string
	insurer: string
	policyNumberMasked: string
	status: PolicyConsumerStatus
	statusColor: string
	coverageLabel: string
	premiumLabel: string | null
	renewalLabel: string | null
	coveredMembers: string[]
	summary: string
	coverages: Array<{
		id: string
		name: string
		amount: string
		detail: string | null
	}>
	benefits: string[]
	exclusions: string[]
	premiumHistory: Array<{
		id: string
		label: string
		amount: string
		dateLabel: string | null
	}>
	renewals: Array<{
		id: string
		dateLabel: string
		amountLabel: string | null
		statusLabel: string
	}>
	claims: Array<{
		id: string
		title: string
		status: string
		amount: string | null
		dateLabel: string | null
	}>
	timeline: InsuranceActivityItem[]
	documents: PolicyDocumentViewModel[]
	aiSummary: string[]
	recommendations: Array<{
		id: string
		title: string
		priority: 'high' | 'medium' | 'low'
	}>
	askPrompt: string
}

const CATEGORY_SHORT: Record<PolicyCategoryId, string> = {
	health: 'Health',
	life_term: 'Life',
	motor: 'Vehicle',
	home: 'Home',
	travel: 'Travel',
}

const DOCUMENT_KIND_LABEL: Record<
	InsuranceKnowledgeDocumentRef['documentKind'],
	string
> = {
	policy_schedule: 'Original policy',
	renewal_notice: 'Renewal',
	endorsement: 'Endorsement',
	claim_letter: 'Claim document',
	eob: 'Claim document',
	premium_receipt: 'Receipt',
	unknown: 'Document',
}

const RENEWAL_STATUS_LABEL: Record<string, string> = {
	upcoming: 'Upcoming',
	due: 'Due',
	paid: 'Paid',
	missed: 'Missed',
}

const CLAIM_STATUS_LABEL: Record<string, string> = {
	filed: 'Filed',
	processing: 'In progress',
	approved: 'Approved',
	rejected: 'Declined',
	paid: 'Paid',
	closed: 'Closed',
}

export function maskPolicyNumber(policyNumber: string): string {
	const trimmed = policyNumber.trim()

	if (!trimmed) {
		return '—'
	}

	if (trimmed.length <= 4) {
		return `•••• ${trimmed}`
	}

	return `•••• ${trimmed.slice(-4)}`
}

function formatMonthYear(date: string | null): string | null {
	if (!date) {
		return null
	}

	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return null
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	})
}

function formatShortDate(date: string | null): string | null {
	if (!date) {
		return null
	}

	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return null
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function formatPremiumAmount(amount: number, currency: string): string {
	if (currency === 'INR') {
		return `₹${amount.toLocaleString('en-IN')}`
	}

	return `${currency} ${amount.toLocaleString()}`
}

function formatPremiumFrequency(frequency: string): string {
	switch (frequency) {
		case 'annual':
			return '/ year'
		case 'semi_annual':
			return '/ 6 mo'
		case 'quarterly':
			return '/ quarter'
		case 'monthly':
			return '/ month'
		case 'single':
			return ' one-time'
		default:
			return ''
	}
}

export function derivePolicyConsumerStatus(
	policy: InsuranceKnowledgePolicy,
): PolicyConsumerStatus {
	if (policy.status === 'cancelled') {
		return 'Cancelled'
	}

	if (policy.status === 'expired' || policy.status === 'lapsed') {
		return policy.status === 'lapsed' ? 'Lapsed' : 'Expired'
	}

	if (policy.isExpiringSoon) {
		return 'Expiring Soon'
	}

	if (policy.status === 'active') {
		return 'Active'
	}

	return 'Active'
}

export function policyStatusColor(status: PolicyConsumerStatus): string {
	switch (status) {
		case 'Active':
			return '#34D399'
		case 'Expiring Soon':
			return '#FBBF24'
		case 'Expired':
		case 'Lapsed':
			return '#FB923C'
		case 'Cancelled':
			return 'rgba(255,255,255,0.35)'
		default:
			return 'rgba(255,255,255,0.45)'
	}
}

function buildRenewalLabel(policy: InsuranceKnowledgePolicy): string | null {
	if (policy.isExpiringSoon && policy.daysUntilExpiry != null) {
		if (policy.daysUntilExpiry <= 0) {
			return 'Renewal due'
		}

		return `Renews in ${policy.daysUntilExpiry} day${policy.daysUntilExpiry === 1 ? '' : 's'}`
	}

	const formatted = formatMonthYear(policy.renewalDate ?? policy.expiryDate)

	if (!formatted) {
		return null
	}

	if (policy.status === 'active') {
		return `Renews ${formatted}`
	}

	return `Renewal ${formatted}`
}

function resolvePolicyDisplayName(
	policy: InsuranceKnowledgePolicy,
	insurerName: string,
): { name: string; assetLabel: string | null } {
	const categoryShort = CATEGORY_SHORT[policy.categoryId]

	if (policy.categoryId === 'motor') {
		const vehicleName = policy.productName?.trim()

		if (vehicleName) {
			const brand = vehicleName.split(/\s+/)[0] ?? vehicleName

			return {
				name: `${brand} Vehicle Insurance`,
				assetLabel: vehicleName,
			}
		}

		return {
			name: `${insurerName} Vehicle Insurance`,
			assetLabel: null,
		}
	}

	if (policy.productName && policy.categoryId === 'health') {
		return {
			name: `${insurerName} ${categoryShort} Insurance`,
			assetLabel: policy.productName,
		}
	}

	return {
		name: `${insurerName} ${categoryShort} Insurance`,
		assetLabel:
			policy.productName &&
			policy.categoryId !== 'health' &&
			policy.categoryId !== 'life_term'
				? policy.productName
				: null,
	}
}

function resolveLatestPremium(
	knowledge: InsuranceKnowledge,
	policyId: string,
): { label: string | null; amount: number | null } {
	const premiums = knowledge.premiums
		.filter((premium) => premium.policyId === policyId)
		.sort((a, b) => {
			const dateA = Date.parse(a.paidDate ?? a.dueDate ?? '')
			const dateB = Date.parse(b.paidDate ?? b.dueDate ?? '')

			return dateB - dateA
		})

	const latest = premiums[0]

	if (!latest) {
		return { label: null, amount: null }
	}

	return {
		label: `${formatPremiumAmount(latest.amount, latest.currency)}${formatPremiumFrequency(latest.frequency)}`,
		amount: latest.amount,
	}
}

function resolvePolicyMembers(
	knowledge: InsuranceKnowledge,
	policyId: string,
): string[] {
	return [
		...new Set(
			knowledge.members
				.filter((member) => member.policyId === policyId)
				.map((member) => member.name)
				.filter(Boolean),
		),
	]
}

function resolvePolicyDocuments(
	knowledge: InsuranceKnowledge,
	policyId: string,
): PolicyDocumentViewModel[] {
	return knowledge.documents
		.filter(
			(document) =>
				document.linkedPolicyIds.includes(policyId) && document.isDisplayReady,
		)
		.map((document) => ({
			id: document.id,
			title: document.fileName,
			kindLabel: DOCUMENT_KIND_LABEL[document.documentKind],
			dateLabel: formatShortDate(document.uploadedAt) ?? '',
			sortDate: document.uploadedAt,
		}))
		.sort((a, b) => Date.parse(b.sortDate) - Date.parse(a.sortDate))
}

function resolveThumbnailDocumentId(
	knowledge: InsuranceKnowledge,
	policy: InsuranceKnowledgePolicy,
): string | null {
	const linked = resolvePolicyDocuments(knowledge, policy.id)
	const original =
		linked.find((document) => document.kindLabel === 'Original policy') ??
		linked[0]

	return original?.id ?? policy.sourceDocumentIds[0] ?? null
}

function resolvePolicySortDate(policy: InsuranceKnowledgePolicy): string {
	return policy.renewalDate ?? policy.expiryDate ?? policy.inceptionDate ?? ''
}

export function buildPolicyCardViewModel(
	knowledge: InsuranceKnowledge,
	policy: InsuranceKnowledgePolicy,
): PolicyCardViewModel {
	const meta = getCategoryMeta(policy.categoryId)
	const { name, assetLabel } = resolvePolicyDisplayName(
		policy,
		policy.insurerName,
	)
	const status = derivePolicyConsumerStatus(policy)
	const premium = resolveLatestPremium(knowledge, policy.id)

	return {
		id: policy.id,
		name,
		categoryLabel: meta.name.replace(' Insurance', '').replace('Term / ', ''),
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		categoryId: policy.categoryId,
		insurer: policy.insurerName,
		policyNumberMasked: maskPolicyNumber(policy.policyNumber),
		coverageLabel: formatCoverageAmount(policy.sumInsured, policy.currency),
		premiumLabel: premium.label,
		premiumAmount: premium.amount,
		renewalLabel: buildRenewalLabel(policy),
		coveredMembers: resolvePolicyMembers(knowledge, policy.id),
		status,
		statusColor: policyStatusColor(status),
		assetLabel,
		thumbnailDocumentId: resolveThumbnailDocumentId(knowledge, policy),
		sortDate: resolvePolicySortDate(policy),
	}
}

export function buildPolicyCards(
	knowledge: InsuranceKnowledge,
): PolicyCardViewModel[] {
	return [...knowledge.policies]
		.map((policy) => buildPolicyCardViewModel(knowledge, policy))
		.sort((a, b) => Date.parse(b.sortDate) - Date.parse(a.sortDate))
}

export function buildPoliciesListViewModel(
	knowledge: InsuranceKnowledge,
): PoliciesListViewModel {
	const policyCards = buildPolicyCards(knowledge)

	return {
		headline: 'Policies',
		subtitle:
			policyCards.length === 0
				? 'Your insurance archive will appear here.'
				: `${policyCards.length} polic${policyCards.length === 1 ? 'y' : 'ies'} in your archive`,
		policyCards,
		totalCount: policyCards.length,
	}
}

function matchesCategoryFilter(
	policy: PolicyCardViewModel,
	categoryFilters: PolicyCategoryFilterId[],
): boolean {
	if (categoryFilters.length === 0) {
		return true
	}

	return categoryFilters.some((filter) => {
		if (filter === 'personal_accident') {
			const haystack = [
				policy.name,
				policy.assetLabel ?? '',
				policy.categoryLabel,
			]
				.join(' ')
				.toLowerCase()

			return haystack.includes('accident') || haystack.includes('pa ')
		}

		return policy.categoryId === filter
	})
}

function matchesStatusFilter(
	policy: PolicyCardViewModel,
	statusFilters: PolicyStatusFilterId[],
): boolean {
	if (statusFilters.length === 0) {
		return true
	}

	return statusFilters.some((filter) => {
		switch (filter) {
			case 'active':
				return policy.status === 'Active'
			case 'expired':
				return policy.status === 'Expired' || policy.status === 'Lapsed'
			case 'expiring_soon':
				return policy.status === 'Expiring Soon'
			case 'cancelled':
				return policy.status === 'Cancelled'
			default:
				return true
		}
	})
}

export interface PolicySearchIntent {
	categoryFilters: PolicyCategoryFilterId[]
	statusFilters: PolicyStatusFilterId[]
	memberQuery: string | null
	insurerQuery: string | null
	expiringThisYear: boolean
	sortByPremiumDesc: boolean
	freeText: string | null
}

export function parsePolicySearchIntent(query: string): PolicySearchIntent {
	const normalized = query.trim().toLowerCase()

	const intent: PolicySearchIntent = {
		categoryFilters: [],
		statusFilters: [],
		memberQuery: null,
		insurerQuery: null,
		expiringThisYear: false,
		sortByPremiumDesc: false,
		freeText: normalized || null,
	}

	if (!normalized) {
		return intent
	}

	if (
		normalized.includes('vehicle') ||
		normalized.includes('motor') ||
		normalized.includes('car')
	) {
		intent.categoryFilters.push('motor')
	}

	if (normalized.includes('health')) {
		intent.categoryFilters.push('health')
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

	if (
		normalized.includes('personal accident') ||
		normalized.includes('accident insurance')
	) {
		intent.categoryFilters.push('personal_accident')
	}

	if (
		normalized.includes('expiring') ||
		normalized.includes('renewal due') ||
		normalized.includes('renew soon')
	) {
		intent.statusFilters.push('expiring_soon')
	}

	if (normalized.includes('expiring this year')) {
		intent.expiringThisYear = true
	}

	if (normalized.includes('expired') || normalized.includes('lapsed')) {
		intent.statusFilters.push('expired')
	}

	if (normalized.includes('cancelled') || normalized.includes('canceled')) {
		intent.statusFilters.push('cancelled')
	}

	if (normalized.includes('active') || normalized.includes('current')) {
		intent.statusFilters.push('active')
	}

	if (
		normalized.includes('highest premium') ||
		normalized.includes('most expensive')
	) {
		intent.sortByPremiumDesc = true
	}

	const coveringMatch = normalized.match(
		/(?:covering|covers|for)\s+([a-z][a-z\s'-]{1,30})/,
	)

	if (coveringMatch?.[1]) {
		intent.memberQuery = coveringMatch[1].trim()
	}

	const iciciMatch = normalized.match(
		/\b(icici|hdfc|bajaj|tata|sbi|max|star)\b/,
	)

	if (iciciMatch?.[1]) {
		intent.insurerQuery = iciciMatch[1]
	}

	const showMatch = normalized.match(
		/show\s+(?:my\s+)?([a-z][a-z\s'-]{1,24})\s+polic/,
	)

	if (showMatch?.[1] && !intent.insurerQuery) {
		intent.insurerQuery = showMatch[1].trim()
	}

	return intent
}

export function scorePolicySearchRelevance(
	card: PolicyCardViewModel,
	knowledge: InsuranceKnowledge,
	query: string,
): number {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return 1
	}

	const intent = parsePolicySearchIntent(query)
	let score = 0

	const haystack = [
		card.name,
		card.insurer,
		card.categoryLabel,
		card.assetLabel ?? '',
		card.policyNumberMasked,
		card.coverageLabel,
		card.coveredMembers.join(' '),
		...resolvePolicyDocuments(knowledge, card.id).map(
			(document) => `${document.title} ${document.kindLabel}`,
		),
	]
		.join(' ')
		.toLowerCase()

	if (haystack.includes(normalized)) {
		score += 100
	}

	for (const token of normalized.split(/\s+/).filter(Boolean)) {
		if (token.length < 2) {
			continue
		}

		if (haystack.includes(token)) {
			score += 12
		}
	}

	if (
		intent.categoryFilters.length > 0 &&
		matchesCategoryFilter(card, intent.categoryFilters)
	) {
		score += 40
	}

	if (
		intent.statusFilters.length > 0 &&
		matchesStatusFilter(card, intent.statusFilters)
	) {
		score += 35
	}

	if (
		intent.insurerQuery &&
		card.insurer.toLowerCase().includes(intent.insurerQuery)
	) {
		score += 50
	}

	if (
		intent.memberQuery &&
		card.coveredMembers.some((member) =>
			member.toLowerCase().includes(intent.memberQuery!),
		)
	) {
		score += 45
	}

	if (intent.expiringThisYear) {
		const policy = knowledge.policies.find((item) => item.id === card.id)
		const expiry = policy?.expiryDate ?? policy?.renewalDate

		if (expiry) {
			const year = new Date(expiry).getFullYear()
			const currentYear = new Date().getFullYear()

			if (year === currentYear) {
				score += 40
			}
		}
	}

	if (
		intent.categoryFilters.length > 0 &&
		!matchesCategoryFilter(card, intent.categoryFilters)
	) {
		return 0
	}

	if (
		intent.statusFilters.length > 0 &&
		!matchesStatusFilter(card, intent.statusFilters)
	) {
		return 0
	}

	return score
}

export function filterPolicyCards(input: {
	cards: PolicyCardViewModel[]
	knowledge: InsuranceKnowledge
	query: string
	categoryFilters: PolicyCategoryFilterId[]
	statusFilters: PolicyStatusFilterId[]
}): PolicyCardViewModel[] {
	const normalized = input.query.trim()
	let results = [...input.cards]

	if (input.categoryFilters.length > 0) {
		results = results.filter((card) =>
			matchesCategoryFilter(card, input.categoryFilters),
		)
	}

	if (input.statusFilters.length > 0) {
		results = results.filter((card) =>
			matchesStatusFilter(card, input.statusFilters),
		)
	}

	if (normalized) {
		const intent = parsePolicySearchIntent(normalized)

		results = results
			.map((card) => ({
				card,
				score: scorePolicySearchRelevance(card, input.knowledge, normalized),
			}))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((item) => item.card)

		if (intent.sortByPremiumDesc) {
			results.sort((a, b) => (b.premiumAmount ?? 0) - (a.premiumAmount ?? 0))
		}
	}

	return results
}

function formatExpiryGroupTitle(date: string | null): string {
	if (!date) {
		return 'No renewal date'
	}

	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return 'No renewal date'
	}

	const value = new Date(parsed)
	const now = new Date()

	if (value < now) {
		return 'Past renewals'
	}

	return value.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	})
}

export function groupPolicyCards(
	cards: PolicyCardViewModel[],
	groupBy: PolicyGroupById,
): PolicyGroupViewModel[] {
	const resolvedGroupBy = groupBy === 'default' ? 'category' : groupBy

	if (resolvedGroupBy === 'category') {
		const order: PolicyCategoryId[] = [
			'health',
			'life_term',
			'motor',
			'home',
			'travel',
		]
		const grouped = new Map<string, PolicyCardViewModel[]>()

		for (const card of cards) {
			const bucket = grouped.get(card.categoryId) ?? []
			bucket.push(card)
			grouped.set(card.categoryId, bucket)
		}

		return order
			.filter((categoryId) => grouped.has(categoryId))
			.map((categoryId) => {
				const policies = grouped.get(categoryId) ?? []

				return {
					id: categoryId,
					title: CATEGORY_SHORT[categoryId],
					subtitle: `${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}`,
					policies,
				}
			})
	}

	if (resolvedGroupBy === 'insurer') {
		const grouped = new Map<string, PolicyCardViewModel[]>()

		for (const card of cards) {
			const bucket = grouped.get(card.insurer) ?? []
			bucket.push(card)
			grouped.set(card.insurer, bucket)
		}

		return [...grouped.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([insurer, policies]) => ({
				id: insurer,
				title: insurer,
				subtitle: `${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}`,
				policies,
			}))
	}

	if (resolvedGroupBy === 'expiry') {
		const grouped = new Map<string, PolicyCardViewModel[]>()

		for (const card of cards) {
			const key = card.sortDate || 'unknown'
			const bucket = grouped.get(key) ?? []
			bucket.push(card)
			grouped.set(key, bucket)
		}

		return [...grouped.entries()]
			.sort(([a], [b]) => Date.parse(a) - Date.parse(b))
			.map(([dateKey, policies]) => ({
				id: dateKey,
				title: formatExpiryGroupTitle(dateKey === 'unknown' ? null : dateKey),
				subtitle: null,
				policies,
			}))
	}

	const grouped = new Map<string, PolicyCardViewModel[]>()

	for (const card of cards) {
		const members =
			card.coveredMembers.length > 0 ? card.coveredMembers : ['Household']

		for (const member of members) {
			const bucket = grouped.get(member) ?? []
			bucket.push(card)
			grouped.set(member, bucket)
		}
	}

	return [...grouped.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([member, policies]) => ({
			id: member,
			title: member,
			subtitle: `${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}`,
			policies,
		}))
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

function buildPolicyAiSummary(
	knowledge: InsuranceKnowledge,
	policy: InsuranceKnowledgePolicy,
	card: PolicyCardViewModel,
): string[] {
	const lines: string[] = []

	if (policy.sumInsured != null && policy.sumInsured > 0) {
		if (card.coveredMembers.length > 0) {
			lines.push(
				`This policy protects ${card.coveredMembers.length === 1 ? card.coveredMembers[0] : 'your family'} with ${card.coverageLabel} ${CATEGORY_SHORT[policy.categoryId].toLowerCase()} coverage.`,
			)
		} else {
			lines.push(
				`This policy provides ${card.coverageLabel} ${CATEGORY_SHORT[policy.categoryId].toLowerCase()} coverage.`,
			)
		}
	}

	const exclusions = knowledge.exclusions.filter(
		(item) => item.policyId === policy.id,
	)

	if (exclusions.length === 0) {
		lines.push('No major exclusions detected.')
	} else if (exclusions.length <= 2) {
		lines.push(
			`Note: ${exclusions.map((item) => item.description).join('; ')}.`,
		)
	}

	if (policy.categoryId === 'health') {
		lines.push('Cashless network may be available through your insurer.')
	}

	if (policy.isExpiringSoon && policy.daysUntilExpiry != null) {
		const months = Math.max(1, Math.round(policy.daysUntilExpiry / 30))
		lines.push(
			`Renewal due in about ${months} month${months === 1 ? '' : 's'}.`,
		)
	} else if (card.renewalLabel) {
		lines.push(`${card.renewalLabel}.`)
	}

	const nominees = knowledge.nominees.filter(
		(item) => item.policyId === policy.id,
	)

	if (nominees.length > 0) {
		lines.push('Nominee information available.')
	}

	const policyInsights = knowledge.insights.filter(
		(item) => item.policyId === policy.id,
	)

	for (const insight of policyInsights.slice(0, 2)) {
		if (!lines.includes(insight.text)) {
			lines.push(insight.text)
		}
	}

	return lines.slice(0, 5)
}

function buildPolicyRecommendations(
	knowledge: InsuranceKnowledge,
	policyId: string,
): PolicyDetailViewModel['recommendations'] {
	return knowledge.recommendations
		.filter((item) =>
			item.evidenceIds.some((evidenceId) => evidenceId.includes(policyId)),
		)
		.slice(0, 4)
		.map((item) => ({
			id: item.id,
			title: item.text,
			priority: item.priority,
		}))
}

export function buildPolicyDetailViewModel(
	knowledge: InsuranceKnowledge,
	policyId: string,
): PolicyDetailViewModel | null {
	const policy = knowledge.policies.find((item) => item.id === policyId)

	if (!policy) {
		return null
	}

	const card = buildPolicyCardViewModel(knowledge, policy)
	const meta = getCategoryMeta(policy.categoryId)
	const premium = resolveLatestPremium(knowledge, policy.id)

	const coverages = knowledge.coverages
		.filter((item) => item.policyId === policy.id)
		.map((item) => ({
			id: item.id,
			name: item.displayName,
			amount: formatCoverageAmount(item.sumInsured, policy.currency),
			detail: item.copay
				? `Co-pay ${item.copay}`
				: item.waitingPeriodDays
					? `${item.waitingPeriodDays}-day waiting period`
					: null,
		}))

	const benefits = knowledge.benefits
		.filter((item) => item.policyId === policy.id)
		.map((item) => item.description)

	const exclusions = knowledge.exclusions
		.filter((item) => item.policyId === policy.id)
		.map((item) => item.description)

	const premiumHistory = knowledge.premiums
		.filter((item) => item.policyId === policy.id)
		.sort(
			(a, b) =>
				Date.parse(b.paidDate ?? b.dueDate ?? '') -
				Date.parse(a.paidDate ?? a.dueDate ?? ''),
		)
		.map((item) => ({
			id: item.id,
			label: item.paidDate ? 'Premium paid' : 'Premium due',
			amount: formatPremiumAmount(item.amount, item.currency),
			dateLabel: formatShortDate(item.paidDate ?? item.dueDate),
		}))

	const renewals = knowledge.renewals
		.filter((item) => item.policyId === policy.id)
		.sort((a, b) => Date.parse(b.renewalDate) - Date.parse(a.renewalDate))
		.map((item) => ({
			id: item.id,
			dateLabel: formatShortDate(item.renewalDate) ?? '',
			amountLabel:
				item.newPremium != null
					? formatPremiumAmount(item.newPremium, policy.currency)
					: null,
			statusLabel: RENEWAL_STATUS_LABEL[item.status] ?? item.status,
		}))

	const claims = knowledge.claims
		.filter((item) => item.policyId === policy.id)
		.map((item) => ({
			id: item.id,
			title: item.claimType ?? 'Claim',
			status: CLAIM_STATUS_LABEL[item.status] ?? item.status,
			amount:
				item.approvedAmount != null
					? formatCoverageAmount(item.approvedAmount, policy.currency)
					: item.claimedAmount != null
						? formatCoverageAmount(item.claimedAmount, policy.currency)
						: null,
			dateLabel: formatShortDate(item.settledDate ?? item.filedDate),
		}))

	const timeline = knowledge.timeline
		.filter((event) => event.policyId === policy.id)
		.slice(0, 8)
		.map((event) => ({
			id: event.id,
			title: humanizeTimelineTitle(event),
			dateLabel: formatShortDate(event.date) ?? '',
			tone:
				event.type === 'claim_settled' || event.type === 'policy_renewed'
					? ('positive' as const)
					: event.type === 'policy_expired'
						? ('attention' as const)
						: ('neutral' as const),
		}))

	const documents = resolvePolicyDocuments(knowledge, policy.id)

	const summaryParts = [
		card.coverageLabel !== '—'
			? `${card.coverageLabel} ${CATEGORY_SHORT[policy.categoryId].toLowerCase()} cover`
			: null,
		card.renewalLabel,
		card.coveredMembers.length > 0
			? `Covers ${card.coveredMembers.join(', ')}`
			: null,
	]
		.filter(Boolean)
		.join(' · ')

	return {
		id: policy.id,
		name: card.name,
		categoryLabel: meta.name,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		insurer: policy.insurerName,
		policyNumberMasked: card.policyNumberMasked,
		status: card.status,
		statusColor: card.statusColor,
		coverageLabel: card.coverageLabel,
		premiumLabel: premium.label,
		renewalLabel: card.renewalLabel,
		coveredMembers: card.coveredMembers,
		summary: summaryParts || `${card.name} with ${policy.insurerName}.`,
		coverages,
		benefits,
		exclusions,
		premiumHistory,
		renewals,
		claims,
		timeline,
		documents,
		aiSummary: buildPolicyAiSummary(knowledge, policy, card),
		recommendations: buildPolicyRecommendations(knowledge, policy.id),
		askPrompt: `Tell me about my ${card.name}`,
	}
}
