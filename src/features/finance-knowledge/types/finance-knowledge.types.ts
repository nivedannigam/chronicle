import type { FinancialFactRecord } from '@/features/finance-knowledge/types/finance-extraction.types'
import type {
	FinanceCoverageMeta,
	FinanceCurrentFact,
	FinanceEntityResolutionState,
	FinanceObservation,
} from '@/features/finance-knowledge/types/finance-history.types'
import type { FinanceSnapshot } from '@/features/finance-knowledge/types/finance-snapshot.types'
import type { FinanceSnapshotHomeView } from '@/features/finance-knowledge/types/finance-snapshot.types'
import type {
	FinanceTimelineEvent,
	FinanceTimelineEventPreview,
} from '@/features/finance-knowledge/types/finance-timeline.types'

export type { FinanceTimelineEvent, FinanceTimelineEventPreview }

export type FinanceSetupStatus =
	'not_connected' | 'scanning' | 'organizing' | 'empty' | 'ready'

export type FinanceEntityStatus = 'active' | 'closed' | 'unknown'

export type FinanceOwnership = 'individual' | 'joint' | 'family' | 'unknown'

export type FinanceFactConfidence = 'high' | 'medium' | 'low'

export interface FinanceFact {
	key: string
	value: string
	asOfDate: string | null
	sourceDocumentId: string
	confidence: FinanceFactConfidence
}

export interface FinanceEntityBase {
	id: string
	displayName: string
	institutionName: string | null
	maskedIdentifier: string | null
	ownership: FinanceOwnership
	ownerMemberIds: string[]
	status: FinanceEntityStatus
	facts: FinanceFact[]
	currentFacts: FinanceCurrentFact[]
	historicalObservations: FinanceObservation[]
	resolutionState: FinanceEntityResolutionState
	latestStatementDate: string | null
	conflictingFactTypes: string[]
	sourceDocumentIds: string[]
	lastUpdatedFromDocumentAt: string | null
}

export interface BankAccountRecord extends FinanceEntityBase {
	kind: 'bank_account'
}

export interface CreditCardRecord extends FinanceEntityBase {
	kind: 'credit_card'
}

export interface LoanRecord extends FinanceEntityBase {
	kind: 'loan'
}

export interface InvestmentAccountRecord extends FinanceEntityBase {
	kind: 'investment_account'
}

export interface HoldingRecord extends FinanceEntityBase {
	kind: 'holding'
	investmentAccountId: string | null
}

export interface TaxRecord extends FinanceEntityBase {
	kind: 'tax_record'
}

export interface FinanceDocumentRef {
	id: string
	chronicleDocumentId: string
	title: string
	fileName: string
	displayLabel: string
	subCategoryId: string | null
	subCategoryLabel: string | null
	classificationConfidence: 'high' | 'medium' | 'low'
	ownerMemberId: string | null
	ownerName: string
	consumerStatus: 'ready' | 'organizing' | 'needs_help'
	uploadedAt: string
	folderPath: string | null
	institutionName: string | null
	statementDate: string | null
	statementPeriodStart: string | null
	statementPeriodEnd: string | null
	linkedEntityId: string | null
	linkedEntityName: string | null
	extractionStatus:
		'pending' | 'complete' | 'incomplete' | 'failed' | 'unsupported' | null
	extractionUserMessage: string | null
}

export interface FinanceAttentionItem {
	id: string
	entityId: string | null
	documentId: string | null
	headline: string
	subline: string
	severity: 'high' | 'medium' | 'low'
}

export interface FinanceChangeItem {
	id: string
	headline: string
	subline: string | null
	occurredAt: string
	entityId: string | null
	documentId: string | null
}

export type FinanceCoverageLevel =
	'not_setup' | 'organizing' | 'partial' | 'documented'

export interface FinanceDocumentTypeCount {
	id: string
	label: string
	count: number
}

export interface FinanceSummary {
	headline: string
	subline: string | null
	coverageLevel: FinanceCoverageLevel
	documentCount: number
	documentTypeCounts: FinanceDocumentTypeCount[]
	bankAccountCount: number
	investmentAccountCount: number
	creditCardCount: number
	loanCount: number
	taxRecordCount: number
	holdingCount: number
	assetTotalKnown: number | null
	liabilityTotalKnown: number | null
	netWorthKnown: number | null
}

export interface FinanceConfidenceMeta {
	overall: 'low' | 'medium' | 'high'
	notes: string[]
}

export interface FinanceKnowledge {
	userId: string
	setupStatus: FinanceSetupStatus
	hasFolderAssigned: boolean
	hasDocuments: boolean
	isOrganizing: boolean
	documentCount: number
	summary: FinanceSummary
	coverage: FinanceCoverageMeta
	snapshot: FinanceSnapshot
	bankAccounts: BankAccountRecord[]
	investmentAccounts: InvestmentAccountRecord[]
	creditCards: CreditCardRecord[]
	loans: LoanRecord[]
	taxRecords: TaxRecord[]
	holdings: HoldingRecord[]
	financialFacts: FinancialFactRecord[]
	currentFacts: FinanceCurrentFact[]
	historicalFacts: FinanceObservation[]
	documents: FinanceDocumentRef[]
	attention: FinanceAttentionItem[]
	recentChanges: FinanceChangeItem[]
	timeline: FinanceTimelineEvent[]
	limitations: string[]
	confidence: FinanceConfidenceMeta
}

export interface FinanceEntityCounts {
	bankAccounts: number
	creditCards: number
	loans: number
	investmentAccounts: number
	total: number
}

export interface FinanceEntitySummary {
	id: string
	kind: 'bank_account' | 'credit_card' | 'loan' | 'investment_account'
	displayName: string
	institutionName: string | null
	maskedIdentifier: string | null
	latestStatementDate: string | null
	lastUpdatedFromDocumentAt: string | null
	ownership: FinanceOwnership
	hasConflict: boolean
}

export interface FinanceHomeViewModel {
	setupStatus: FinanceSetupStatus
	statusHeadline: string
	statusSubline: string | null
	documentTypeCounts: FinanceDocumentTypeCount[]
	entityCounts: FinanceEntityCounts
	entitySummaries: FinanceEntitySummary[]
	snapshot: FinanceSnapshotHomeView
	attentionItems: FinanceAttentionItem[]
	askSuggestions: string[]
	showLibraryLink: boolean
	documentCount: number
	coverageOrganizingNote: string | null
	recentActivity: FinanceTimelineEventPreview[]
	showHistoryLink: boolean
}
