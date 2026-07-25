import type { MetricStatus } from '@/features/health/types'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'
import type {
	MetricHistoryRecord,
	YearTimelineGroup,
} from '@/features/semantic-memory/types/semantic-memory.types'

export type KnowledgeDomain =
	'health' | 'finance' | 'travel' | 'mail' | 'documents' | 'photos'

export type AskIntent =
	| 'organ_status'
	| 'metric_trend'
	| 'metric_history'
	| 'abnormal_reports'
	| 'improving_metrics'
	| 'declining_metrics'
	| 'compare_reports'
	| 'summarize_report'
	| 'latest_report'
	| 'doctor_discussion'
	| 'metric_lookup'
	| 'general_health'
	| 'health_journey'
	| 'resolved_findings'
	| 'attention_summary'
	| 'summarize_health'
	| 'since_last_report'
	| 'explain_response'
	| 'find_document'
	| 'list_documents'
	| 'document_expiry'
	| 'document_summary'
	| 'general_documents'
	| 'timeline_query'
	| 'timeline_search'
	| 'timeline_last_event'

export interface RetrievalQuery {
	userId: string
	question: string
	intent: AskIntent
	resolvedQuestion: string
	categoryId?: string
	metricId?: string
	metricName?: string
	timeRangeYears?: number
	uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
	documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
	connectorDocuments?: import('@/core/connectors').ConnectorDocumentRecord[]
	documentCategoryId?: string
	searchHits?: SemanticSearchHit[]
	member?: IntelligenceMemberContext
}

export interface RetrievedReport {
	id: string
	title: string
	date: string
	lab: string
	category: string
	summary: string
}

export interface RetrievedMetric {
	canonicalId: string
	displayName: string
	latestValue: string
	unit: string | null
	status: string
	referenceRange: string
	trend: string
	categoryId: string
	reportId: string
	reportTitle: string
	observedAt: string
}

export interface RetrievedObservation {
	id: string
	metricId: string
	displayName: string
	value: string
	status: string
	observedAt: string
	reportId: string
	reportTitle: string
	referenceRange: string
}

export interface RetrievedTimeline {
	metricId: string
	displayName: string
	unit: string | null
	trend: string
	observations: RetrievedObservation[]
	baseline: {
		latest: string
		lowest: string | null
		highest: string | null
		firstRecorded: string | null
		lastRecorded: string | null
	}
}

export interface RetrievedTrend {
	metricId: string
	displayName: string
	direction: string
	changePercent: string
	dataPointCount: number
	latestValue: string
}

export interface RetrievedRelationship {
	id: string
	fromMetricId: string
	toMetricId: string
	label: string
}

export interface RetrievedComparison {
	id: string
	label: string
	olderLabel: string
	newerLabel: string
	metrics: Array<{
		metric: string
		oldValue: string
		newValue: string
		difference: string
		status: MetricStatus
	}>
}

export interface RetrievedKnowledge {
	domain: KnowledgeDomain
	intent: AskIntent
	reports: RetrievedReport[]
	metrics: RetrievedMetric[]
	timelines: RetrievedTimeline[]
	trends: RetrievedTrend[]
	observations: RetrievedObservation[]
	relationships: RetrievedRelationship[]
	insights: string[]
	alerts: string[]
	summaryLines: string[]
	comparisons: RetrievedComparison[]
	semanticTimeline?: YearTimelineGroup[]
	metricHistories?: MetricHistoryRecord[]
}

export interface KnowledgeRetriever {
	readonly domain: KnowledgeDomain
	retrieve(query: RetrievalQuery): RetrievedKnowledge
}
