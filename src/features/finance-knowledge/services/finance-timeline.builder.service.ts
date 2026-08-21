import { compareFinancialDates } from '@/features/finance-knowledge/services/finance-observation.service'
import { maskFinanceIdentifier } from '@/features/finance-knowledge/services/finance-preferences.service'
import type { FinanceObservation } from '@/features/finance-knowledge/types/finance-history.types'
import type {
	FinanceTimelineBuildResult,
	FinanceTimelineEvent,
	FinanceTimelineEventType,
	FinanceTimelineImportance,
} from '@/features/finance-knowledge/types/finance-timeline.types'
import type {
	BankAccountRecord,
	CreditCardRecord,
	FinanceDocumentRef,
	FinanceEntityBase,
	InvestmentAccountRecord,
	LoanRecord,
} from '@/features/finance-knowledge/types/finance-knowledge.types'
import { parseMoneyValue } from '@/features/finance-knowledge/utils/finance-money.util'

/** Ignore balance drift smaller than this for INR (statement rounding noise). */
const INR_MATERIALITY_FLOOR = 1000

/** Relative change threshold for larger balances (≥ ₹50,000). */
const LARGE_BALANCE_RELATIVE_THRESHOLD = 0.02

const FACT_TYPES = {
	bank_account: 'closing_balance',
	loan: 'outstanding_principal',
	investment_account: 'market_value',
	credit_card: 'total_amount_due',
} as const

function resolveDocumentLabel(
	documentId: string,
	documents: FinanceDocumentRef[],
): string | null {
	return (
		documents.find((document) => document.chronicleDocumentId === documentId)
			?.displayLabel ?? null
	)
}

function isMaterialChange(
	previousValue: string,
	currentValue: string,
): boolean {
	const previous = parseMoneyValue(previousValue)
	const current = parseMoneyValue(currentValue)

	if (!previous || !current || previous.currency !== current.currency) {
		return previousValue.trim() !== currentValue.trim()
	}

	const delta = Math.abs(current.amount - previous.amount)
	if (delta < INR_MATERIALITY_FLOOR) {
		return false
	}

	if (previous.amount >= 50000) {
		/** Monthly loan/investment moves often sit around 1–2%; ₹50k+ captures real changes. */
		const LARGE_ABSOLUTE_CHANGE = 50000
		return (
			delta >= LARGE_ABSOLUTE_CHANGE ||
			delta / previous.amount >= LARGE_BALANCE_RELATIVE_THRESHOLD
		)
	}

	return true
}

function buildEventId(input: {
	entityId: string
	eventType: FinanceTimelineEventType
	eventDate: string
	currentValue: string | null
}): string {
	return `finance-event:${input.entityId}:${input.eventType}:${input.eventDate}:${input.currentValue ?? 'na'}`
}

function buildEvent(input: {
	entity: FinanceEntityBase
	entityKind: string
	eventType: FinanceTimelineEventType
	title: string
	description: string
	eventDate: string
	sourceDocumentIds: string[]
	importance: FinanceTimelineImportance
	factType: string | null
	previousValue?: string | null
	currentValue?: string | null
	sourceDocumentLabel?: string | null
}): FinanceTimelineEvent {
	return {
		id: buildEventId({
			entityId: input.entity.id,
			eventType: input.eventType,
			eventDate: input.eventDate,
			currentValue: input.currentValue ?? null,
		}),
		eventType: input.eventType,
		title: input.title,
		description: input.description,
		eventDate: input.eventDate,
		entityId: input.entity.id,
		entityDisplayName: input.entity.displayName,
		sourceDocumentIds: input.sourceDocumentIds,
		importance: input.importance,
		ownership: input.entity.ownership,
		ownerMemberIds: input.entity.ownerMemberIds,
		metadata: {
			factType: input.factType,
			previousValue: input.previousValue ?? null,
			currentValue: input.currentValue ?? null,
			sourceDocumentLabel: input.sourceDocumentLabel ?? null,
			entityKind: input.entityKind,
		},
	}
}

function observationsForEntity(
	entityId: string,
	factType: string,
	historicalFacts: FinanceObservation[],
): FinanceObservation[] {
	return historicalFacts
		.filter(
			(observation) =>
				observation.entityId === entityId &&
				observation.factType === factType &&
				observation.verified &&
				!observation.isConflicting &&
				observation.asOfDate,
		)
		.sort((left, right) => compareFinancialDates(left.asOfDate, right.asOfDate))
}

function addedEventType(entityKind: string): FinanceTimelineEventType {
	switch (entityKind) {
		case 'loan':
			return 'LOAN_ADDED'
		case 'credit_card':
			return 'CREDIT_CARD_STATEMENT'
		default:
			return 'ACCOUNT_ADDED'
	}
}

function updatedEventType(entityKind: string): FinanceTimelineEventType {
	switch (entityKind) {
		case 'loan':
			return 'LOAN_BALANCE_UPDATED'
		case 'credit_card':
			return 'CREDIT_CARD_STATEMENT'
		case 'investment_account':
			return 'INVESTMENT_VALUE_UPDATED'
		default:
			return 'ACCOUNT_UPDATED'
	}
}

function updateTitle(entityKind: string): string {
	switch (entityKind) {
		case 'loan':
			return 'Loan balance updated'
		case 'credit_card':
			return 'Credit card statement recorded'
		case 'investment_account':
			return 'Investment value updated'
		default:
			return 'Bank balance updated'
	}
}

function addedTitle(entityKind: string): string {
	switch (entityKind) {
		case 'loan':
			return 'Loan added'
		case 'credit_card':
			return 'Credit card statement recorded'
		case 'investment_account':
			return 'Investment account added'
		default:
			return 'Bank account added'
	}
}

function buildEntityTimelineEvents(input: {
	entity: FinanceEntityBase
	entityKind: string
	historicalFacts: FinanceObservation[]
	documents: FinanceDocumentRef[]
}): FinanceTimelineEvent[] {
	const factType =
		FACT_TYPES[input.entityKind as keyof typeof FACT_TYPES] ?? 'closing_balance'
	const observations = observationsForEntity(
		input.entity.id,
		factType,
		input.historicalFacts,
	)

	if (observations.length === 0) {
		return []
	}

	const events: FinanceTimelineEvent[] = []
	const first = observations[0]!
	const firstSourceLabel = resolveDocumentLabel(
		first.sourceDocumentId,
		input.documents,
	)

	events.push(
		buildEvent({
			entity: input.entity,
			entityKind: input.entityKind,
			eventType: addedEventType(input.entityKind),
			title: addedTitle(input.entityKind),
			description: input.entity.displayName,
			eventDate: first.asOfDate!,
			sourceDocumentIds: first.sourceDocumentIds,
			importance: 'medium',
			factType,
			currentValue: first.value,
			sourceDocumentLabel: firstSourceLabel,
		}),
	)

	for (let index = 1; index < observations.length; index += 1) {
		const previous = observations[index - 1]!
		const current = observations[index]!

		if (input.entityKind === 'credit_card') {
			events.push(
				buildEvent({
					entity: input.entity,
					entityKind: input.entityKind,
					eventType: 'CREDIT_CARD_STATEMENT',
					title: 'Credit card statement recorded',
					description: input.entity.displayName,
					eventDate: current.asOfDate!,
					sourceDocumentIds: current.sourceDocumentIds,
					importance: 'medium',
					factType,
					previousValue: previous.value,
					currentValue: current.value,
					sourceDocumentLabel: resolveDocumentLabel(
						current.sourceDocumentId,
						input.documents,
					),
				}),
			)
			continue
		}

		if (!isMaterialChange(previous.value, current.value)) {
			continue
		}

		events.push(
			buildEvent({
				entity: input.entity,
				entityKind: input.entityKind,
				eventType: updatedEventType(input.entityKind),
				title: updateTitle(input.entityKind),
				description: input.entity.displayName,
				eventDate: current.asOfDate!,
				sourceDocumentIds: current.sourceDocumentIds,
				importance:
					input.entityKind === 'loan' ||
					input.entityKind === 'investment_account'
						? 'high'
						: 'medium',
				factType,
				previousValue: previous.value,
				currentValue: current.value,
				sourceDocumentLabel: resolveDocumentLabel(
					current.sourceDocumentId,
					input.documents,
				),
			}),
		)
	}

	return events
}

function dedupeEvents(events: FinanceTimelineEvent[]): FinanceTimelineEvent[] {
	const map = new Map<string, FinanceTimelineEvent>()
	for (const event of events) {
		map.set(event.id, event)
	}
	return [...map.values()].sort((left, right) =>
		compareFinancialDates(left.eventDate, right.eventDate),
	)
}

export function buildFinanceTimelineEvents(input: {
	bankAccounts: BankAccountRecord[]
	creditCards: CreditCardRecord[]
	loans: LoanRecord[]
	investmentAccounts: InvestmentAccountRecord[]
	historicalFacts: FinanceObservation[]
	documents: FinanceDocumentRef[]
	recentLimit?: number
}): FinanceTimelineBuildResult {
	const entities: Array<{ entity: FinanceEntityBase; kind: string }> = [
		...input.bankAccounts.map((entity) => ({ entity, kind: 'bank_account' })),
		...input.creditCards.map((entity) => ({ entity, kind: 'credit_card' })),
		...input.loans.map((entity) => ({ entity, kind: 'loan' })),
		...input.investmentAccounts.map((entity) => ({
			entity,
			kind: 'investment_account',
		})),
	]

	const events = dedupeEvents(
		entities.flatMap(({ entity, kind }) =>
			buildEntityTimelineEvents({
				entity,
				entityKind: kind,
				historicalFacts: input.historicalFacts,
				documents: input.documents,
			}),
		),
	)

	const recentEvents = [...events]
		.sort((left, right) =>
			compareFinancialDates(left.eventDate, right.eventDate),
		)
		.slice(0, input.recentLimit ?? 3)

	return { events, recentEvents }
}

export function applyFinanceTimelinePrivacy(
	event: FinanceTimelineEvent,
	preferences: import('@/features/finance-knowledge/services/finance-preferences.service').FinancePreferences,
): FinanceTimelineEvent {
	const next = { ...event, metadata: { ...event.metadata } }

	if (preferences.hideSensitiveTimelinePreviews) {
		next.metadata.previousValue = null
		next.metadata.currentValue = null
	}

	if (preferences.maskAccountNumbers && next.description) {
		next.description =
			maskFinanceIdentifier(next.description, preferences) ?? next.description
	}

	return next
}
