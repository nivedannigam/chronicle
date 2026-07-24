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

export interface AskReasoningEngine {
	answerQuestion(input: {
		userId: string
		question: string
		memberId?: string | null
		memberName?: string | null
		familyMembers?: import('@/features/family/types/family.types').FamilyMemberWithAliases[]
		onStream?: (partialAnswer: string) => void
		uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
		connectorDocuments?: import('@/core/connectors').ConnectorDocumentRecord[]
	}): Promise<import('@/features/ask/types').AskQuestionResult>
}
