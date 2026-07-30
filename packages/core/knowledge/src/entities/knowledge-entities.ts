import type { KnowledgeDomain } from '../types/knowledge-domain.types.ts'

/** Shared knowledge entities — domain-agnostic models all providers map into. */

export interface KnowledgeRelationship {
	id: string
	type: string
	fromEntityId: string
	toEntityId: string
	label: string
	sourceProvider: string
}

export interface KnowledgeSemanticTimelineYear {
	year: number
	events: Array<{
		id: string
		date: string
		label: string
		kind: string
		metricId?: string
		categoryId?: string
		reportId?: string
		evidence?: string
	}>
}

export interface KnowledgeMetricHistoryDetail {
	canonicalId: string
	displayName: string
	categoryId: string
	latestValue: string
	previousValue: string | null
	trend: string
	trendDirection: string
	highest: string | null
	lowest: string | null
	average: string | null
	latestStatus: string
	latestObservedAt: string
	changePercent: string | null
	dataPointCount: number
	sourceProvider: string
}

export interface KnowledgePerson {
	id: string
	name: string
	role?: string
	sourceProvider: string
}

export interface KnowledgeDocument {
	id: string
	title: string
	date: string
	category: string
	summary: string
	sourceProvider: string
	sourceDomain: KnowledgeDomain
	metadata?: Record<string, string>
}

export interface KnowledgeMetric {
	id: string
	canonicalId: string
	displayName: string
	value: string
	unit: string | null
	status: string
	referenceRange: string
	trend: string
	observedAt: string
	documentId: string
	documentTitle: string
	sourceProvider: string
	relevanceScore?: number
}

export interface KnowledgeObservation {
	id: string
	metricId: string
	displayName: string
	value: string
	status: string
	observedAt: string
	documentId: string
	documentTitle: string
	referenceRange: string
	sourceProvider: string
}

export interface KnowledgeTimelineEvent {
	id: string
	metricId: string
	displayName: string
	unit: string | null
	trend: string
	observations: KnowledgeObservation[]
	baseline: {
		latest: string
		lowest: string | null
		highest: string | null
		firstRecorded: string | null
		lastRecorded: string | null
	}
	sourceProvider: string
}

export interface KnowledgeFinding {
	id: string
	kind: 'insight' | 'alert' | 'summary' | 'comparison'
	label: string
	content: string
	severity?: string
	documentIds?: string[]
	sourceProvider: string
}

export interface KnowledgeReference {
	id: string
	documentId: string
	documentTitle: string
	metricName?: string
	date: string
	snippet?: string
	source: KnowledgeDomain
	sourceProvider: string
	relevanceScore?: number
}

export interface KnowledgeComparison {
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
	sourceProvider: string
}

/** Raw context package returned by a single Knowledge Provider. */
export interface KnowledgeContextPackage {
	persons: KnowledgePerson[]
	documents: KnowledgeDocument[]
	metrics: KnowledgeMetric[]
	observations: KnowledgeObservation[]
	timelineEvents: KnowledgeTimelineEvent[]
	findings: KnowledgeFinding[]
	references: KnowledgeReference[]
	comparisons: KnowledgeComparison[]
	relationships: KnowledgeRelationship[]
	semanticTimeline: KnowledgeSemanticTimelineYear[]
	metricHistories: KnowledgeMetricHistoryDetail[]
	summaryLines: string[]
	insights: string[]
	alerts: string[]
}

export function createEmptyContextPackage(): KnowledgeContextPackage {
	return {
		persons: [],
		documents: [],
		metrics: [],
		observations: [],
		timelineEvents: [],
		findings: [],
		references: [],
		comparisons: [],
		relationships: [],
		semanticTimeline: [],
		metricHistories: [],
		summaryLines: [],
		insights: [],
		alerts: [],
	}
}

export function isContextPackageEmpty(pkg: KnowledgeContextPackage): boolean {
	return (
		pkg.documents.length === 0 &&
		pkg.metrics.length === 0 &&
		pkg.summaryLines.length === 0 &&
		pkg.insights.length === 0 &&
		pkg.findings.length === 0 &&
		pkg.semanticTimeline.length === 0 &&
		pkg.metricHistories.length === 0
	)
}
