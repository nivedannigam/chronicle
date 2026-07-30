import type { KnowledgeContextPackage } from '../entities/knowledge-entities.ts'
import type {
	RetrievedComparison,
	RetrievedKnowledge,
} from '../types/retrieval.types.ts'
import type { AskIntent } from '../types/ask-intent.types.ts'
import type { KnowledgeDomain } from '../types/knowledge-domain.types.ts'

/** Bridges the domain-agnostic entity model to the legacy retrieval shape used by Ask UI. */
export function toRetrievedKnowledge(
	pkg: KnowledgeContextPackage,
	domain: KnowledgeDomain,
	intent: AskIntent,
): RetrievedKnowledge {
	return {
		domain,
		intent,
		reports: pkg.documents.map(toRetrievedReport),
		metrics: pkg.metrics.map(toRetrievedMetric),
		timelines: pkg.timelineEvents.map(toRetrievedTimeline),
		trends: buildTrendsFromMetrics(pkg),
		observations: pkg.observations.map(toRetrievedObservation),
		relationships: pkg.relationships.map((relationship) => ({
			id: relationship.id,
			fromMetricId: relationship.fromEntityId.replace(/^metric:/, ''),
			toMetricId: relationship.toEntityId.replace(/^metric:/, ''),
			label: relationship.label,
		})),
		insights: [
			...pkg.insights,
			...pkg.findings.filter((f) => f.kind === 'insight').map((f) => f.content),
		],
		alerts: [
			...pkg.alerts,
			...pkg.findings.filter((f) => f.kind === 'alert').map((f) => f.content),
		],
		summaryLines: pkg.summaryLines,
		comparisons: pkg.comparisons.map(toRetrievedComparison),
		semanticTimeline: pkg.semanticTimeline.map((group) => ({
			year: group.year,
			events: group.events.map((event) => ({
				id: event.id,
				year: group.year,
				date: event.date,
				label: event.label,
				kind: event.kind,
				metricId: event.metricId,
				categoryId: event.categoryId,
				reportId: event.reportId,
				evidence: event.evidence,
			})),
		})),
		metricHistories: pkg.metricHistories.map((history) => ({
			canonicalId: history.canonicalId,
			displayName: history.displayName,
			categoryId: history.categoryId,
			unit: null,
			latestValue: history.latestValue,
			previousValue: history.previousValue,
			trend: history.trend,
			trendDirection: history.trendDirection,
			highest: history.highest,
			lowest: history.lowest,
			average: history.average,
			latestStatus: history.latestStatus,
			previousStatus: null,
			latestObservedAt: history.latestObservedAt,
			previousObservedAt: null,
			dataPointCount: history.dataPointCount,
			changePercent: history.changePercent,
			linkedReportIds: [],
		})),
	}
}

function toRetrievedReport(
	doc: KnowledgeContextPackage['documents'][number],
): RetrievedKnowledge['reports'][number] {
	return {
		id: doc.id,
		title: doc.title,
		date: doc.date,
		lab: doc.metadata?.laboratory ?? doc.metadata?.lab ?? '',
		category: doc.category,
		summary: doc.summary,
	}
}

function toRetrievedMetric(
	metric: KnowledgeContextPackage['metrics'][number],
): RetrievedKnowledge['metrics'][number] {
	return {
		canonicalId: metric.canonicalId,
		displayName: metric.displayName,
		latestValue: metric.value,
		unit: metric.unit,
		status: metric.status,
		referenceRange: metric.referenceRange,
		trend: metric.trend,
		categoryId: metric.canonicalId.split('-')[0] ?? '',
		reportId: metric.documentId,
		reportTitle: metric.documentTitle,
		observedAt: metric.observedAt,
	}
}

function toRetrievedObservation(
	obs: KnowledgeContextPackage['observations'][number],
): RetrievedKnowledge['observations'][number] {
	return {
		id: obs.id,
		metricId: obs.metricId,
		displayName: obs.displayName,
		value: obs.value,
		status: obs.status,
		observedAt: obs.observedAt,
		reportId: obs.documentId,
		reportTitle: obs.documentTitle,
		referenceRange: obs.referenceRange,
	}
}

function toRetrievedTimeline(
	event: KnowledgeContextPackage['timelineEvents'][number],
): RetrievedKnowledge['timelines'][number] {
	return {
		metricId: event.metricId,
		displayName: event.displayName,
		unit: event.unit,
		trend: event.trend,
		observations: event.observations.map(toRetrievedObservation),
		baseline: event.baseline,
	}
}

function toRetrievedComparison(
	comparison: KnowledgeContextPackage['comparisons'][number],
): RetrievedComparison {
	return {
		id: comparison.id,
		label: comparison.label,
		olderLabel: comparison.olderLabel,
		newerLabel: comparison.newerLabel,
		metrics: comparison.metrics.map((metric) => ({
			metric: metric.metric,
			oldValue: metric.oldValue,
			newValue: metric.newValue,
			difference: metric.difference,
			status: metric.status,
		})),
	}
}

function buildTrendsFromMetrics(
	pkg: KnowledgeContextPackage,
): RetrievedKnowledge['trends'] {
	if (pkg.metricHistories.length > 0) {
		return pkg.metricHistories.map((history) => ({
			metricId: history.canonicalId,
			displayName: history.displayName,
			direction: history.trendDirection,
			changePercent: history.changePercent ?? '—',
			dataPointCount: history.dataPointCount,
			latestValue: history.latestValue,
		}))
	}

	const seen = new Set<string>()
	const trends: RetrievedKnowledge['trends'] = []

	for (const metric of pkg.metrics) {
		if (seen.has(metric.canonicalId)) {
			continue
		}

		seen.add(metric.canonicalId)
		trends.push({
			metricId: metric.canonicalId,
			displayName: metric.displayName,
			direction: metric.trend,
			changePercent: '—',
			dataPointCount: pkg.observations.filter(
				(obs) => obs.metricId === metric.canonicalId,
			).length,
			latestValue: metric.value,
		})
	}

	return trends
}

/** Maps legacy RetrievedKnowledge into the shared entity model. */
export function fromRetrievedKnowledge(
	knowledge: RetrievedKnowledge,
	providerId: string,
): KnowledgeContextPackage {
	return {
		persons: [],
		documents: knowledge.reports.map((report) => ({
			id: report.id,
			title: report.title,
			date: report.date,
			category: report.category,
			summary: report.summary,
			sourceProvider: providerId,
			sourceDomain: knowledge.domain,
			metadata: { laboratory: report.lab },
		})),
		metrics: knowledge.metrics.map((metric) => ({
			id: `${metric.reportId}-${metric.canonicalId}`,
			canonicalId: metric.canonicalId,
			displayName: metric.displayName,
			value: metric.latestValue,
			unit: metric.unit,
			status: metric.status,
			referenceRange: metric.referenceRange,
			trend: metric.trend,
			observedAt: metric.observedAt,
			documentId: metric.reportId,
			documentTitle: metric.reportTitle,
			sourceProvider: providerId,
		})),
		observations: knowledge.observations.map((obs) => ({
			id: obs.id,
			metricId: obs.metricId,
			displayName: obs.displayName,
			value: obs.value,
			status: obs.status,
			observedAt: obs.observedAt,
			documentId: obs.reportId,
			documentTitle: obs.reportTitle,
			referenceRange: obs.referenceRange,
			sourceProvider: providerId,
		})),
		timelineEvents: knowledge.timelines.map((timeline, index) => ({
			id: `timeline-${timeline.metricId}-${index}`,
			metricId: timeline.metricId,
			displayName: timeline.displayName,
			unit: timeline.unit,
			trend: timeline.trend,
			observations: timeline.observations.map((obs) => ({
				id: obs.id,
				metricId: obs.metricId,
				displayName: obs.displayName,
				value: obs.value,
				status: obs.status,
				observedAt: obs.observedAt,
				documentId: obs.reportId,
				documentTitle: obs.reportTitle,
				referenceRange: obs.referenceRange,
				sourceProvider: providerId,
			})),
			baseline: timeline.baseline,
			sourceProvider: providerId,
		})),
		findings: [
			...knowledge.insights.map((content, index) => ({
				id: `insight-${index}`,
				kind: 'insight' as const,
				label: 'Insight',
				content,
				sourceProvider: providerId,
			})),
			...knowledge.alerts.map((content, index) => ({
				id: `alert-${index}`,
				kind: 'alert' as const,
				label: 'Alert',
				content,
				severity: 'warning',
				sourceProvider: providerId,
			})),
		],
		references: buildReferencesFromKnowledge(knowledge, providerId),
		comparisons: knowledge.comparisons.map((comparison) => ({
			id: comparison.id,
			label: comparison.label,
			olderLabel: comparison.olderLabel,
			newerLabel: comparison.newerLabel,
			metrics: comparison.metrics.map((metric) => ({
				metric: metric.metric,
				oldValue: metric.oldValue,
				newValue: metric.newValue,
				difference: metric.difference,
				status: metric.status,
			})),
			sourceProvider: providerId,
		})),
		relationships: knowledge.relationships.map((relationship) => ({
			id: relationship.id,
			type: 'metric_correlates_with_metric',
			fromEntityId: `metric:${relationship.fromMetricId}`,
			toEntityId: `metric:${relationship.toMetricId}`,
			label: relationship.label,
			sourceProvider: providerId,
		})),
		semanticTimeline: (knowledge.semanticTimeline ?? []).map((group) => ({
			year: group.year,
			events: group.events.map((event) => ({
				id: event.id,
				date: event.date,
				label: event.label,
				kind: event.kind,
				metricId: event.metricId,
				categoryId: event.categoryId,
				reportId: event.reportId,
				evidence: event.evidence,
			})),
		})),
		metricHistories: (knowledge.metricHistories ?? []).map((history) => ({
			canonicalId: history.canonicalId,
			displayName: history.displayName,
			categoryId: history.categoryId,
			latestValue: history.latestValue,
			previousValue: history.previousValue,
			trend: history.trend,
			trendDirection: history.trendDirection,
			highest: history.highest,
			lowest: history.lowest,
			average: history.average,
			latestStatus: history.latestStatus,
			latestObservedAt: history.latestObservedAt,
			changePercent: history.changePercent,
			dataPointCount: history.dataPointCount,
			sourceProvider: providerId,
		})),
		summaryLines: knowledge.summaryLines,
		insights: knowledge.insights,
		alerts: knowledge.alerts,
	}
}

function buildReferencesFromKnowledge(
	knowledge: RetrievedKnowledge,
	providerId: string,
): KnowledgeContextPackage['references'] {
	const references: KnowledgeContextPackage['references'] = []

	for (const metric of knowledge.metrics.slice(0, 8)) {
		references.push({
			id: `ref-metric-${metric.reportId}-${metric.canonicalId}`,
			documentId: metric.reportId,
			documentTitle: metric.reportTitle,
			metricName: metric.displayName,
			date: metric.observedAt,
			source: knowledge.domain,
			sourceProvider: providerId,
		})
	}

	for (const report of knowledge.reports.slice(0, 6)) {
		if (references.some((ref) => ref.documentId === report.id)) {
			continue
		}

		references.push({
			id: `ref-doc-${report.id}`,
			documentId: report.id,
			documentTitle: report.title,
			date: report.date,
			source: knowledge.domain,
			sourceProvider: providerId,
		})
	}

	return references
}
