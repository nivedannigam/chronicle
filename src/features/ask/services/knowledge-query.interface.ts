import type { KnowledgeSearchResult } from '@/features/knowledge/types'
import type {
	MetricSearchResult,
	ReportComparisonResult,
	ReportSearchCriteria,
	ReportSummaryResult,
} from '@/features/ask/types'
import type { HealthReport } from '@/features/health/types'

export interface KnowledgeQueryService {
	searchKnowledge(userId: string, query: string): KnowledgeSearchResult
	findReports(userId: string, criteria: ReportSearchCriteria): HealthReport[]
	findMetrics(userId: string, metricName: string): MetricSearchResult[]
	compareReports(
		userId: string,
		olderReportId?: string,
		newerReportId?: string,
	): ReportComparisonResult | null
	summarizeReport(userId: string, reportId?: string): ReportSummaryResult | null
}

export interface AskScopeContext {
	categoryId?: string
	reportId?: string
	reportIds?: string[]
	/** Module context from deep links (e.g. identity Ask chips). */
	contextModule?:
		'identity' | 'health' | 'insurance' | 'vehicles' | 'finance' | 'property'
	/** When set for property Ask, reflects whether a Home folder is connected. */
	hasPropertyFolderAssigned?: boolean
	documentId?: string
	entityId?: string
	policyId?: string
	claimId?: string
	vehicleSlug?: string
	/** When set for finance Ask, reflects whether a Finance folder is connected. */
	hasFinanceFolderAssigned?: boolean
}

export interface AskReasoningEngine {
	answerQuestion(input: {
		userId: string
		question: string
		memberId?: string | null
		memberName?: string | null
		familyMembers?: import('@/features/family/types/family.types').FamilyMemberWithAliases[]
		onStream?: (partialAnswer: string) => void
		uploadedReports?: unknown[]
		storedMetrics?: unknown[]
		connectorDocuments?: import('@/core/connectors').ConnectorDocumentRecord[]
		documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
		personalPreferences?: import('@/features/personalization/types/personal-context.types').ChroniclePersonalPreferences
		scope?: AskScopeContext
	}): Promise<import('@/features/ask/types').AskQuestionResult>
}
