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
