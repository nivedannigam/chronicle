import type { AskIntent } from './ask-intent.types.ts'
import type { KnowledgeDomain } from './knowledge-domain.types.ts'
import type { MemberContext } from './member-context.types.ts'
import type {
	MetricHistoryRecord,
	YearTimelineGroup,
} from './timeline.types.ts'
import type { SemanticSearchHit } from './search-hit.types.ts'

export interface RetrievalQuery {
	userId: string
	question: string
	intent: AskIntent
	resolvedQuestion: string
	categoryId?: string
	metricId?: string
	metricName?: string
	timeRangeYears?: number
	searchHits?: SemanticSearchHit[]
	member?: MemberContext
	/** Domain-specific payloads keyed by provider id (e.g. health, documents). */
	sources?: Record<string, unknown>
	/** @deprecated Prefer sources.health.uploadedReports */
	uploadedReports?: unknown[]
	/** @deprecated Prefer sources.documents */
	documents?: unknown[]
	connectorDocuments?: unknown[]
	documentCategoryId?: string
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
		status: string
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
