/** Semantic Memory — normalized health knowledge independent of source documents. */

export type SemanticEntityType =
	| 'metric'
	| 'diagnosis'
	| 'finding'
	| 'observation'
	| 'medication'
	| 'procedure'
	| 'recommendation'
	| 'hospital'
	| 'doctor'
	| 'person'
	| 'report'

export type SemanticRelationshipType =
	| 'report_contains_metric'
	| 'metric_belongs_to_person'
	| 'metric_measured_on_date'
	| 'finding_references_organ'
	| 'recommendation_references_finding'
	| 'observation_references_timeline_event'
	| 'metric_correlates_with_metric'

export interface SemanticEntity {
	id: string
	type: SemanticEntityType
	canonicalId: string
	label: string
	aliases: string[]
	sourceReportIds: string[]
	firstSeenAt: string | null
	lastSeenAt: string | null
	metadata?: Record<string, string>
}

export interface MetricHistoryRecord {
	canonicalId: string
	displayName: string
	categoryId: string
	unit: string | null
	latestValue: string
	previousValue: string | null
	trend: string
	trendDirection:
		'improving' | 'stable' | 'declining' | 'rapid_change' | 'unknown'
	highest: string | null
	lowest: string | null
	average: string | null
	latestStatus: string
	previousStatus: string | null
	latestObservedAt: string
	previousObservedAt: string | null
	dataPointCount: number
	changePercent: string | null
	linkedReportIds: string[]
}

export interface SemanticRelationship {
	id: string
	type: SemanticRelationshipType
	fromEntityId: string
	toEntityId: string
	label: string
	sourceReportId?: string
}

export interface TimelineEvent {
	id: string
	year: number
	date: string
	label: string
	kind: 'metric_change' | 'finding' | 'improvement' | 'resolution' | 'category'
	metricId?: string
	categoryId?: string
	status?: string
	reportId?: string
	reportTitle?: string
	evidence?: string
}

export interface YearTimelineGroup {
	year: number
	events: TimelineEvent[]
}

export interface SemanticInsight {
	id: string
	kind:
		| 'persistent_trend'
		| 'improving_trend'
		| 'new_abnormality'
		| 'resolved_abnormality'
		| 'missing_follow_up'
		| 'summary'
	text: string
	metricId?: string
	categoryId?: string
	evidenceReportIds: string[]
}

export interface SemanticMemory {
	personId: string
	entities: SemanticEntity[]
	metricHistories: MetricHistoryRecord[]
	relationships: SemanticRelationship[]
	timeline: YearTimelineGroup[]
	insights: SemanticInsight[]
	hospitals: SemanticEntity[]
	doctors: SemanticEntity[]
	generatedAt: string
}

export function createEmptySemanticMemory(personId: string): SemanticMemory {
	return {
		personId,
		entities: [],
		metricHistories: [],
		relationships: [],
		timeline: [],
		insights: [],
		hospitals: [],
		doctors: [],
		generatedAt: new Date().toISOString(),
	}
}
