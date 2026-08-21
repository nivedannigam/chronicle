import type { FinanceOwnership } from '@/features/finance-knowledge/types/finance-knowledge.types'

export type FinanceTimelineEventType =
	| 'ACCOUNT_ADDED'
	| 'ACCOUNT_UPDATED'
	| 'LOAN_ADDED'
	| 'LOAN_BALANCE_UPDATED'
	| 'CREDIT_CARD_STATEMENT'
	| 'INVESTMENT_VALUE_UPDATED'
	| 'TAX_RECORD_ADDED'
	| 'ENTITY_CLOSED'
	| 'IMPORTANT_FINANCIAL_CHANGE'

export type FinanceTimelineImportance = 'low' | 'medium' | 'high'

export interface FinanceTimelineEventMetadata {
	factType: string | null
	previousValue: string | null
	currentValue: string | null
	sourceDocumentLabel: string | null
	entityKind: string | null
}

export interface FinanceTimelineEvent {
	id: string
	eventType: FinanceTimelineEventType
	title: string
	description: string
	eventDate: string
	entityId: string | null
	entityDisplayName: string | null
	sourceDocumentIds: string[]
	importance: FinanceTimelineImportance
	ownership: FinanceOwnership
	ownerMemberIds: string[]
	metadata: FinanceTimelineEventMetadata
}

export interface FinanceTimelineBuildResult {
	events: FinanceTimelineEvent[]
	recentEvents: FinanceTimelineEvent[]
}

export interface FinanceTimelineEventPreview {
	id: string
	title: string
	entityDisplayName: string | null
	eventDate: string
}
