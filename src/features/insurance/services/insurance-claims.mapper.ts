import type {
	InsuranceKnowledge,
	InsuranceKnowledgeClaim,
	InsuranceKnowledgeDocumentRef,
	InsuranceKnowledgePolicy,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import { getCategoryMeta } from '@/features/insurance-knowledge/graph/policy-categories'
import { formatCoverageAmount } from '@/features/insurance/services/insurance-consumer-status.service'

export type ClaimConsumerStatus =
	| 'Submitted'
	| 'Under Review'
	| 'Approved'
	| 'Partially Approved'
	| 'Settled'
	| 'Rejected'
	| 'Closed'

export type ClaimCategoryFilterId = PolicyCategoryId

export type ClaimStatusFilterId = 'pending' | 'settled' | 'rejected'

export type ClaimTimeFilterId = 'this_year' | 'last_year'

export interface ClaimSummaryStat {
	id: string
	label: string
	value: string
	tone?: 'neutral' | 'positive' | 'attention'
}

export interface ClaimCardViewModel {
	id: string
	title: string
	policyName: string
	policyId: string
	insurer: string
	categoryId: PolicyCategoryId
	categoryLabel: string
	categoryEmoji: string
	categoryColor: string
	claimedAmountLabel: string | null
	approvedAmountLabel: string | null
	status: ClaimConsumerStatus
	statusColor: string
	incidentDateLabel: string | null
	settlementDateLabel: string | null
	coveredMember: string | null
	thumbnailDocumentId: string | null
	sortDate: string
	claimedAmount: number | null
	approvedAmount: number | null
}

export interface ClaimsDashboardViewModel {
	headline: string
	subtitle: string
	summary: ClaimSummaryStat[]
	claimCards: ClaimCardViewModel[]
	totalCount: number
}

export interface ClaimTimelineStep {
	id: string
	label: string
	dateLabel: string | null
	isComplete: boolean
	isCurrent: boolean
}

export interface ClaimDocumentViewModel {
	id: string
	title: string
	kindLabel: string
	dateLabel: string
	sortDate: string
}

export interface ClaimDetailViewModel {
	id: string
	title: string
	policyId: string
	policyName: string
	insurer: string
	categoryLabel: string
	categoryEmoji: string
	categoryColor: string
	status: ClaimConsumerStatus
	statusColor: string
	claimedAmountLabel: string | null
	approvedAmountLabel: string | null
	incidentDateLabel: string | null
	settlementDateLabel: string | null
	coveredMember: string | null
	summary: string
	timeline: ClaimTimelineStep[]
	documents: ClaimDocumentViewModel[]
	payments: Array<{
		id: string
		label: string
		amount: string
		dateLabel: string | null
	}>
	notes: string[]
	aiSummary: string[]
	recommendations: Array<{
		id: string
		title: string
		priority: 'high' | 'medium' | 'low'
	}>
	askPrompt: string
}

const CATEGORY_SHORT: Record<PolicyCategoryId, string> = {
	health: 'Health Insurance',
	life_term: 'Life Insurance',
	motor: 'Vehicle Insurance',
	home: 'Home Insurance',
	travel: 'Travel Insurance',
}

const CLAIM_DOCUMENT_KINDS = new Set<
	InsuranceKnowledgeDocumentRef['documentKind']
>(['claim_letter', 'eob'])

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

function resolvePolicyName(policy: InsuranceKnowledgePolicy): string {
	if (policy.categoryId === 'motor' && policy.productName) {
		const brand = policy.productName.split(/\s+/)[0] ?? policy.productName
		return `${brand} Vehicle Insurance`
	}

	return `${policy.insurerName} ${CATEGORY_SHORT[policy.categoryId]}`
}

function humanizeClaimType(claimType: string | null): string {
	if (!claimType) {
		return 'Claim'
	}

	const normalized = claimType.toLowerCase()

	if (normalized.includes('cashless') || normalized.includes('hospital')) {
		return 'Hospitalization'
	}

	if (normalized.includes('accident')) {
		return 'Accident'
	}

	if (normalized.includes('reimburse')) {
		return 'Reimbursement'
	}

	if (normalized.includes('repair')) {
		return 'Repair'
	}

	return claimType.charAt(0).toUpperCase() + claimType.slice(1)
}

function resolveCoveredMember(
	knowledge: InsuranceKnowledge,
	policyId: string,
): string | null {
	const members = knowledge.members.filter(
		(member) => member.policyId === policyId,
	)

	if (members.length === 0) {
		return null
	}

	if (members.length === 1) {
		return members[0]?.name ?? null
	}

	return members[0]?.name ?? null
}

function isPartialApproval(claim: InsuranceKnowledgeClaim): boolean {
	if (claim.claimedAmount == null || claim.approvedAmount == null) {
		return false
	}

	if (claim.claimedAmount <= 0) {
		return false
	}

	return claim.approvedAmount < claim.claimedAmount * 0.99
}

export function deriveClaimConsumerStatus(
	claim: InsuranceKnowledgeClaim,
): ClaimConsumerStatus {
	if (claim.status === 'rejected') {
		return 'Rejected'
	}

	if (claim.status === 'closed') {
		return 'Closed'
	}

	if (claim.status === 'paid') {
		return 'Settled'
	}

	if (claim.status === 'filed') {
		return 'Submitted'
	}

	if (claim.status === 'processing') {
		return 'Under Review'
	}

	if (claim.status === 'approved') {
		return isPartialApproval(claim) ? 'Partially Approved' : 'Approved'
	}

	return 'Under Review'
}

export function claimStatusColor(status: ClaimConsumerStatus): string {
	switch (status) {
		case 'Settled':
			return '#34D399'
		case 'Approved':
		case 'Partially Approved':
			return '#2DD4BF'
		case 'Submitted':
		case 'Under Review':
			return '#FBBF24'
		case 'Rejected':
			return '#FB923C'
		case 'Closed':
		default:
			return 'rgba(255,255,255,0.35)'
	}
}

function isPendingStatus(status: ClaimConsumerStatus): boolean {
	return (
		status === 'Submitted' ||
		status === 'Under Review' ||
		status === 'Approved' ||
		status === 'Partially Approved'
	)
}

function buildClaimTitle(
	claim: InsuranceKnowledgeClaim,
	policy: InsuranceKnowledgePolicy,
	coveredMember: string | null,
): string {
	if (policy.categoryId === 'motor' && policy.productName) {
		const suffix = humanizeClaimType(claim.claimType)
		return `${policy.productName} ${suffix}`
	}

	if (policy.categoryId === 'health') {
		const typeLabel = humanizeClaimType(claim.claimType)

		if (coveredMember) {
			return `${coveredMember} ${typeLabel}`
		}

		if (claim.providerName) {
			return `${claim.providerName} ${typeLabel}`
		}
	}

	if (claim.providerName) {
		return `${claim.providerName} ${humanizeClaimType(claim.claimType)}`
	}

	return `${policy.insurerName} ${humanizeClaimType(claim.claimType)}`
}

function inferDocumentKindLabel(
	document: InsuranceKnowledgeDocumentRef,
): string {
	if (document.documentKind === 'claim_letter') {
		return inferFromFileName(document.fileName, 'Claim document')
	}

	if (document.documentKind === 'eob') {
		return 'Settlement letter'
	}

	if (document.documentKind === 'premium_receipt') {
		return 'Receipt'
	}

	return inferFromFileName(document.fileName, 'Document')
}

function inferFromFileName(fileName: string, fallback: string): string {
	const normalized = fileName.toLowerCase()

	if (normalized.includes('settlement')) {
		return 'Settlement letter'
	}

	if (normalized.includes('approval') || normalized.includes('authorized')) {
		return 'Approval letter'
	}

	if (normalized.includes('estimate')) {
		return 'Repair estimate'
	}

	if (normalized.includes('invoice') || normalized.includes('bill')) {
		return normalized.includes('hospital') ? 'Hospital bill' : 'Invoice'
	}

	if (normalized.includes('receipt')) {
		return 'Receipt'
	}

	if (normalized.includes('claim')) {
		return 'Claim form'
	}

	if (normalized.includes('hospital') || normalized.includes('discharge')) {
		return 'Hospital document'
	}

	if (normalized.includes('repair') || normalized.includes('garage')) {
		return 'Repair invoice'
	}

	return fallback
}

function isClaimRelatedDocument(
	document: InsuranceKnowledgeDocumentRef,
): boolean {
	if (CLAIM_DOCUMENT_KINDS.has(document.documentKind)) {
		return true
	}

	const normalized = document.fileName.toLowerCase()

	return (
		normalized.includes('claim') ||
		normalized.includes('settlement') ||
		normalized.includes('bill') ||
		normalized.includes('invoice') ||
		normalized.includes('receipt') ||
		normalized.includes('estimate') ||
		normalized.includes('approval') ||
		normalized.includes('hospital') ||
		normalized.includes('repair') ||
		normalized.includes('garage') ||
		normalized.includes('accident') ||
		normalized.includes('eob')
	)
}

function resolveClaimDocuments(
	knowledge: InsuranceKnowledge,
	claim: InsuranceKnowledgeClaim,
): ClaimDocumentViewModel[] {
	const filedTime = claim.filedDate ? Date.parse(claim.filedDate) : null
	const settledTime = claim.settledDate ? Date.parse(claim.settledDate) : null
	const windowMs = 120 * 24 * 60 * 60 * 1000

	return knowledge.documents
		.filter(
			(document) =>
				document.isDisplayReady &&
				document.linkedPolicyIds.includes(claim.policyId) &&
				isClaimRelatedDocument(document),
		)
		.filter((document) => {
			if (filedTime == null) {
				return true
			}

			const uploaded = Date.parse(document.uploadedAt)

			if (Number.isNaN(uploaded)) {
				return true
			}

			const start = filedTime - windowMs
			const end = (settledTime ?? filedTime) + windowMs

			return uploaded >= start && uploaded <= end
		})
		.map((document) => ({
			id: document.id,
			title: document.fileName,
			kindLabel: inferDocumentKindLabel(document),
			dateLabel: formatShortDate(document.uploadedAt) ?? '',
			sortDate: document.uploadedAt,
		}))
		.sort((a, b) => Date.parse(a.sortDate) - Date.parse(b.sortDate))
}

function resolveClaimSortDate(claim: InsuranceKnowledgeClaim): string {
	return claim.settledDate ?? claim.filedDate ?? ''
}

function resolvePolicyForClaim(
	knowledge: InsuranceKnowledge,
	claim: InsuranceKnowledgeClaim,
): InsuranceKnowledgePolicy | null {
	return (
		knowledge.policies.find((policy) => policy.id === claim.policyId) ?? null
	)
}

export function buildClaimCardViewModel(
	knowledge: InsuranceKnowledge,
	claim: InsuranceKnowledgeClaim,
): ClaimCardViewModel | null {
	const policy = resolvePolicyForClaim(knowledge, claim)

	if (!policy) {
		return null
	}

	const meta = getCategoryMeta(policy.categoryId)
	const coveredMember = resolveCoveredMember(knowledge, policy.id)
	const status = deriveClaimConsumerStatus(claim)
	const documents = resolveClaimDocuments(knowledge, claim)

	return {
		id: claim.id,
		title: buildClaimTitle(claim, policy, coveredMember),
		policyName: resolvePolicyName(policy),
		policyId: policy.id,
		insurer: policy.insurerName,
		categoryId: policy.categoryId,
		categoryLabel: CATEGORY_SHORT[policy.categoryId],
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		claimedAmountLabel:
			claim.claimedAmount != null
				? `${formatCoverageAmount(claim.claimedAmount, policy.currency)} Claimed`
				: null,
		approvedAmountLabel:
			claim.approvedAmount != null
				? `${formatCoverageAmount(claim.approvedAmount, policy.currency)} Approved`
				: status === 'Under Review' || status === 'Submitted'
					? 'Pending assessment'
					: null,
		status,
		statusColor: claimStatusColor(status),
		incidentDateLabel: formatMonthYear(claim.filedDate),
		settlementDateLabel: formatShortDate(claim.settledDate),
		coveredMember,
		thumbnailDocumentId: documents[0]?.id ?? null,
		sortDate: resolveClaimSortDate(claim),
		claimedAmount: claim.claimedAmount,
		approvedAmount: claim.approvedAmount,
	}
}

export function buildClaimCards(
	knowledge: InsuranceKnowledge,
): ClaimCardViewModel[] {
	return knowledge.claims
		.map((claim) => buildClaimCardViewModel(knowledge, claim))
		.filter((card): card is ClaimCardViewModel => card != null)
		.sort((a, b) => Date.parse(b.sortDate) - Date.parse(a.sortDate))
}

function computeAverageSettlementDays(
	claims: InsuranceKnowledgeClaim[],
): number | null {
	const settled = claims.filter(
		(claim) =>
			claim.filedDate &&
			claim.settledDate &&
			(claim.status === 'paid' || claim.status === 'approved'),
	)

	if (settled.length === 0) {
		return null
	}

	const totalDays = settled.reduce((sum, claim) => {
		const filed = Date.parse(claim.filedDate!)
		const settledAt = Date.parse(claim.settledDate!)

		return (
			sum + Math.max(0, Math.round((settledAt - filed) / (1000 * 60 * 60 * 24)))
		)
	}, 0)

	return Math.round(totalDays / settled.length)
}

export function buildClaimsDashboardViewModel(
	knowledge: InsuranceKnowledge,
): ClaimsDashboardViewModel {
	const claimCards = buildClaimCards(knowledge)
	const currency =
		knowledge.policies[0]?.currency ?? knowledge.summary.currency ?? 'INR'

	const totalClaimed = knowledge.claims.reduce(
		(sum, claim) => sum + (claim.claimedAmount ?? 0),
		0,
	)

	const totalSettled = knowledge.claims
		.filter(
			(claim) =>
				claim.status === 'paid' ||
				claim.status === 'approved' ||
				claim.approvedAmount != null,
		)
		.reduce((sum, claim) => sum + (claim.approvedAmount ?? 0), 0)

	const pendingCount = claimCards.filter((card) =>
		isPendingStatus(card.status),
	).length

	const rejectedCount = claimCards.filter(
		(card) => card.status === 'Rejected',
	).length

	const avgDays = computeAverageSettlementDays(knowledge.claims)

	const summary: ClaimSummaryStat[] = [
		{
			id: 'total',
			label: 'Total Claims',
			value: String(claimCards.length),
		},
		{
			id: 'claimed',
			label: 'Amount Claimed',
			value: formatCoverageAmount(totalClaimed || null, currency),
		},
		{
			id: 'settled',
			label: 'Amount Settled',
			value: formatCoverageAmount(totalSettled || null, currency),
			tone: totalSettled > 0 ? 'positive' : 'neutral',
		},
		{
			id: 'pending',
			label: 'Pending Claims',
			value: String(pendingCount),
			tone: pendingCount > 0 ? 'attention' : 'neutral',
		},
		{
			id: 'rejected',
			label: 'Rejected Claims',
			value: String(rejectedCount),
			tone: rejectedCount > 0 ? 'attention' : 'neutral',
		},
		{
			id: 'avg-settlement',
			label: 'Average Settlement Time',
			value: avgDays != null ? `${avgDays} days` : '—',
		},
	]

	return {
		headline: 'Claims',
		subtitle:
			claimCards.length === 0
				? 'Your claim history will appear here.'
				: `${claimCards.length} claim${claimCards.length === 1 ? '' : 's'} on record`,
		summary,
		claimCards,
		totalCount: claimCards.length,
	}
}

function matchesCategoryFilter(
	card: ClaimCardViewModel,
	categoryFilters: ClaimCategoryFilterId[],
): boolean {
	if (categoryFilters.length === 0) {
		return true
	}

	return categoryFilters.includes(card.categoryId)
}

function matchesStatusFilter(
	card: ClaimCardViewModel,
	statusFilters: ClaimStatusFilterId[],
): boolean {
	if (statusFilters.length === 0) {
		return true
	}

	return statusFilters.some((filter) => {
		switch (filter) {
			case 'pending':
				return isPendingStatus(card.status)
			case 'settled':
				return card.status === 'Settled'
			case 'rejected':
				return card.status === 'Rejected'
			default:
				return true
		}
	})
}

function matchesTimeFilter(
	claim: InsuranceKnowledgeClaim,
	timeFilters: ClaimTimeFilterId[],
): boolean {
	if (timeFilters.length === 0) {
		return true
	}

	const date = claim.filedDate ?? claim.settledDate

	if (!date) {
		return false
	}

	const year = new Date(date).getFullYear()
	const currentYear = new Date().getFullYear()

	return timeFilters.some((filter) => {
		switch (filter) {
			case 'this_year':
				return year === currentYear
			case 'last_year':
				return year === currentYear - 1
			default:
				return true
		}
	})
}

export interface ClaimSearchIntent {
	categoryFilters: ClaimCategoryFilterId[]
	statusFilters: ClaimStatusFilterId[]
	memberQuery: string | null
	sortByAmountDesc: boolean
	rejectedOnly: boolean
	pendingOnly: boolean
}

export function parseClaimSearchIntent(query: string): ClaimSearchIntent {
	const normalized = query.trim().toLowerCase()

	const intent: ClaimSearchIntent = {
		categoryFilters: [],
		statusFilters: [],
		memberQuery: null,
		sortByAmountDesc: false,
		rejectedOnly: false,
		pendingOnly: false,
	}

	if (!normalized) {
		return intent
	}

	if (normalized.includes('health')) {
		intent.categoryFilters.push('health')
	}

	if (normalized.includes('vehicle') || normalized.includes('motor')) {
		intent.categoryFilters.push('motor')
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

	if (normalized.includes('pending')) {
		intent.pendingOnly = true
		intent.statusFilters.push('pending')
	}

	if (normalized.includes('rejected') || normalized.includes('declined')) {
		intent.rejectedOnly = true
		intent.statusFilters.push('rejected')
	}

	if (normalized.includes('settled') || normalized.includes('approved')) {
		intent.statusFilters.push('settled')
	}

	if (
		normalized.includes('largest') ||
		normalized.includes('biggest') ||
		normalized.includes('highest')
	) {
		intent.sortByAmountDesc = true
	}

	const memberMatch = normalized.match(
		/(?:claims?\s+for|for)\s+([a-z][a-z\s'-]{1,24})/,
	)

	if (memberMatch?.[1]) {
		intent.memberQuery = memberMatch[1].trim()
	}

	return intent
}

export function scoreClaimSearchRelevance(
	card: ClaimCardViewModel,
	query: string,
): number {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return 1
	}

	const intent = parseClaimSearchIntent(query)
	let score = 0

	const haystack = [
		card.title,
		card.policyName,
		card.insurer,
		card.categoryLabel,
		card.coveredMember ?? '',
		card.status,
		card.claimedAmountLabel ?? '',
		card.approvedAmountLabel ?? '',
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
		intent.memberQuery &&
		(card.coveredMember?.toLowerCase().includes(intent.memberQuery) ||
			card.title.toLowerCase().includes(intent.memberQuery))
	) {
		score += 45
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

export function filterClaimCards(input: {
	cards: ClaimCardViewModel[]
	knowledge: InsuranceKnowledge
	query: string
	categoryFilters: ClaimCategoryFilterId[]
	statusFilters: ClaimStatusFilterId[]
	timeFilters: ClaimTimeFilterId[]
}): ClaimCardViewModel[] {
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

	if (input.timeFilters.length > 0) {
		const claimById = new Map(
			input.knowledge.claims.map((claim) => [claim.id, claim]),
		)

		results = results.filter((card) => {
			const claim = claimById.get(card.id)

			return claim ? matchesTimeFilter(claim, input.timeFilters) : false
		})
	}

	const normalized = input.query.trim()

	if (normalized) {
		const intent = parseClaimSearchIntent(normalized)

		results = results
			.map((card) => ({
				card,
				score: scoreClaimSearchRelevance(card, normalized),
			}))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((item) => item.card)

		if (intent.sortByAmountDesc) {
			results.sort((a, b) => (b.claimedAmount ?? 0) - (a.claimedAmount ?? 0))
		}
	}

	return results
}

function buildClaimTimeline(
	knowledge: InsuranceKnowledge,
	claim: InsuranceKnowledgeClaim,
	policy: InsuranceKnowledgePolicy,
	documents: ClaimDocumentViewModel[],
): ClaimTimelineStep[] {
	const status = deriveClaimConsumerStatus(claim)
	const isSettled = status === 'Settled' || status === 'Closed'
	const hasApprovalDoc = documents.some((document) =>
		document.kindLabel.toLowerCase().includes('approval'),
	)
	const hasBillDoc = documents.some((document) =>
		['bill', 'invoice'].some((term) =>
			document.kindLabel.toLowerCase().includes(term),
		),
	)
	const hasEstimateDoc = documents.some((document) =>
		document.kindLabel.toLowerCase().includes('estimate'),
	)
	const hasRepairDoc = documents.some((document) =>
		document.kindLabel.toLowerCase().includes('repair'),
	)

	const healthSteps = [
		{
			id: 'admission',
			label: 'Hospital Admission',
			complete: Boolean(claim.filedDate),
			date: claim.filedDate,
		},
		{
			id: 'cashless',
			label: 'Cashless Approval',
			complete:
				hasApprovalDoc ||
				claim.claimType?.toLowerCase().includes('cashless') === true,
			date: hasApprovalDoc
				? documents.find((d) => d.kindLabel.includes('Approval'))?.sortDate
				: null,
		},
		{
			id: 'discharge',
			label: 'Hospital Discharge',
			complete: hasBillDoc || isSettled,
			date: null,
		},
		{
			id: 'bill',
			label: 'Final Bill',
			complete: hasBillDoc || claim.claimedAmount != null,
			date: hasBillDoc
				? documents.find((d) => d.kindLabel.includes('Bill'))?.sortDate
				: null,
		},
		{
			id: 'settlement',
			label: 'Settlement',
			complete: isSettled,
			date: claim.settledDate,
		},
	]

	const motorSteps = [
		{
			id: 'accident',
			label: 'Accident',
			complete: Boolean(claim.filedDate),
			date: claim.filedDate,
		},
		{
			id: 'survey',
			label: 'Survey',
			complete: hasApprovalDoc || status !== 'Submitted',
			date: null,
		},
		{
			id: 'estimate',
			label: 'Garage Estimate',
			complete: hasEstimateDoc || claim.claimedAmount != null,
			date: hasEstimateDoc
				? documents.find((d) => d.kindLabel.includes('estimate'))?.sortDate
				: null,
		},
		{
			id: 'repair',
			label: 'Repair',
			complete: hasRepairDoc || isSettled,
			date: null,
		},
		{
			id: 'settlement',
			label: 'Settlement',
			complete: isSettled,
			date: claim.settledDate,
		},
	]

	const genericSteps = [
		{
			id: 'submitted',
			label: 'Claim Submitted',
			complete: Boolean(claim.filedDate),
			date: claim.filedDate,
		},
		{
			id: 'review',
			label: 'Under Review',
			complete: status !== 'Submitted',
			date: null,
		},
		{
			id: 'settlement',
			label: 'Settlement',
			complete: isSettled || status === 'Rejected',
			date: claim.settledDate,
		},
	]

	const steps =
		policy.categoryId === 'health'
			? healthSteps
			: policy.categoryId === 'motor'
				? motorSteps
				: genericSteps

	const firstIncompleteIndex = steps.findIndex((step) => !step.complete)
	const lastCompleteIndex =
		firstIncompleteIndex === -1
			? steps.length - 1
			: Math.max(0, firstIncompleteIndex - 1)

	return steps.map((step, index) => ({
		id: step.id,
		label: step.label,
		dateLabel: formatShortDate(step.date ?? null),
		isComplete: step.complete,
		isCurrent:
			index ===
			(firstIncompleteIndex === -1 ? lastCompleteIndex : firstIncompleteIndex),
	}))
}

function buildClaimAiSummary(
	claim: InsuranceKnowledgeClaim,
	card: ClaimCardViewModel,
): string[] {
	const lines: string[] = []
	const status = deriveClaimConsumerStatus(claim)

	if (status === 'Settled') {
		lines.push('This claim was successfully settled.')

		if (
			claim.claimedAmount != null &&
			claim.approvedAmount != null &&
			claim.claimedAmount > 0
		) {
			const pct = Math.round((claim.approvedAmount / claim.claimedAmount) * 100)
			lines.push(`${pct}% of the claimed amount was approved.`)
		}

		if (claim.filedDate && claim.settledDate) {
			const days = Math.max(
				1,
				Math.round(
					(Date.parse(claim.settledDate) - Date.parse(claim.filedDate)) /
						(1000 * 60 * 60 * 24),
				),
			)
			lines.push(`Settlement completed in ${days} days.`)
		}

		lines.push('No further action required.')
	} else if (status === 'Rejected') {
		lines.push('This claim was not approved by the insurer.')
		lines.push('Review the settlement letter for details.')
	} else if (isPendingStatus(status)) {
		lines.push('This claim is still being reviewed by your insurer.')

		if (claim.claimedAmount != null) {
			lines.push(
				`${card.claimedAmountLabel?.replace(' Claimed', '') ?? 'An amount'} is under assessment.`,
			)
		}
	}

	const policyInsights = claim.providerName
		? [`Provider: ${claim.providerName}.`]
		: []

	return [...lines, ...policyInsights].slice(0, 5)
}

function buildClaimRecommendations(
	knowledge: InsuranceKnowledge,
	claim: InsuranceKnowledgeClaim,
	documents: ClaimDocumentViewModel[],
): ClaimDetailViewModel['recommendations'] {
	const recommendations: ClaimDetailViewModel['recommendations'] = []
	const status = deriveClaimConsumerStatus(claim)

	const hasSettlementLetter = documents.some((document) =>
		document.kindLabel.toLowerCase().includes('settlement'),
	)

	const hasFinalInvoice = documents.some((document) =>
		['bill', 'invoice'].some((term) =>
			document.kindLabel.toLowerCase().includes(term),
		),
	)

	if (status === 'Settled' && !hasSettlementLetter) {
		recommendations.push({
			id: `rec-${claim.id}-settlement-letter`,
			title: 'Settlement letter not found.',
			priority: 'medium',
		})
	}

	if (
		isPendingStatus(status) &&
		!hasFinalInvoice &&
		claim.claimedAmount == null
	) {
		recommendations.push({
			id: `rec-${claim.id}-invoice`,
			title: 'Final invoice missing.',
			priority: 'high',
		})
	}

	if (claim.filedDate && isPendingStatus(status)) {
		const daysSinceFiled = Math.round(
			(Date.now() - Date.parse(claim.filedDate)) / (1000 * 60 * 60 * 24),
		)

		if (daysSinceFiled >= 45) {
			recommendations.push({
				id: `rec-${claim.id}-follow-up`,
				title: `Claim still pending after ${daysSinceFiled} days.`,
				priority: 'high',
			})
			recommendations.push({
				id: `rec-${claim.id}-insurer`,
				title: 'Follow up with insurer.',
				priority: 'high',
			})
		}
	}

	if (status === 'Settled' && claim.approvedAmount != null) {
		recommendations.push({
			id: `rec-${claim.id}-tax`,
			title: 'Keep these bills for tax purposes.',
			priority: 'low',
		})
	}

	for (const item of knowledge.recommendations) {
		if (item.evidenceIds.some((evidenceId) => evidenceId.includes(claim.id))) {
			recommendations.push({
				id: item.id,
				title: item.text,
				priority: item.priority,
			})
		}
	}

	return recommendations.slice(0, 5)
}

export function buildClaimDetailViewModel(
	knowledge: InsuranceKnowledge,
	claimId: string,
): ClaimDetailViewModel | null {
	const claim = knowledge.claims.find((item) => item.id === claimId)

	if (!claim) {
		return null
	}

	const card = buildClaimCardViewModel(knowledge, claim)

	if (!card) {
		return null
	}

	const policy = resolvePolicyForClaim(knowledge, claim)!

	const meta = getCategoryMeta(policy.categoryId)
	const documents = resolveClaimDocuments(knowledge, claim)
	const timeline = buildClaimTimeline(knowledge, claim, policy, documents)

	const payments =
		claim.approvedAmount != null && claim.settledDate
			? [
					{
						id: `payment-${claim.id}`,
						label: 'Settlement payment',
						amount: formatCoverageAmount(claim.approvedAmount, policy.currency),
						dateLabel: formatShortDate(claim.settledDate),
					},
				]
			: []

	const notes: string[] = []

	if (claim.providerName) {
		notes.push(`Provider: ${claim.providerName}`)
	}

	if (claim.claimType) {
		notes.push(`Type: ${humanizeClaimType(claim.claimType)}`)
	}

	const summaryParts = [
		card.claimedAmountLabel,
		card.approvedAmountLabel,
		card.incidentDateLabel ? `Incident ${card.incidentDateLabel}` : null,
		card.settlementDateLabel ? `Settled ${card.settlementDateLabel}` : null,
	]
		.filter(Boolean)
		.join(' · ')

	return {
		id: claim.id,
		title: card.title,
		policyId: policy.id,
		policyName: card.policyName,
		insurer: card.insurer,
		categoryLabel: meta.name,
		categoryEmoji: meta.emoji,
		categoryColor: meta.color,
		status: card.status,
		statusColor: card.statusColor,
		claimedAmountLabel: card.claimedAmountLabel,
		approvedAmountLabel: card.approvedAmountLabel,
		incidentDateLabel: card.incidentDateLabel,
		settlementDateLabel: card.settlementDateLabel,
		coveredMember: card.coveredMember,
		summary: summaryParts || `${card.title} on ${card.policyName}.`,
		timeline,
		documents,
		payments,
		notes,
		aiSummary: buildClaimAiSummary(claim, card),
		recommendations: buildClaimRecommendations(knowledge, claim, documents),
		askPrompt: `Tell me about my ${card.title} claim`,
	}
}
