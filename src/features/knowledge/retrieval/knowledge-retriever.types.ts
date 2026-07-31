import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'

export type {
	KnowledgeDomain,
	AskIntent,
	BaseAskIntent,
	HealthAskIntent,
	MemberContext,
	DetectedIntent,
	SemanticSearchHit,
	RetrievalQuery as CoreRetrievalQuery,
	RetrievedReport,
	RetrievedMetric,
	RetrievedObservation,
	RetrievedTimeline,
	RetrievedTrend,
	RetrievedRelationship,
	RetrievedComparison,
	RetrievedKnowledge,
	KnowledgeRetriever,
	TimelineEventRecord,
	YearTimelineGroup,
	MetricHistoryRecord,
} from '@chronicle/core-knowledge'

/** App-level retrieval query with typed domain source payloads. */
export interface RetrievalQuery {
	userId: string
	question: string
	intent: import('@chronicle/core-knowledge').AskIntent
	resolvedQuestion: string
	categoryId?: string
	metricId?: string
	metricName?: string
	timeRangeYears?: number
	searchHits?: import('@chronicle/core-knowledge').SemanticSearchHit[]
	member?: import('@chronicle/core-knowledge').MemberContext
	sources?: Record<string, unknown>
	uploadedReports?: UploadedHealthReport[]
	storedMetrics?: import('@/features/health/types/health-metric-record.types').StoredHealthMetric[]
	documents?: ChronicleDocument[]
	connectorDocuments?: ConnectorDocumentRecord[]
	documentCategoryId?: string
}
