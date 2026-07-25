import type {
	MetricHistoryRecord,
	SemanticEntity,
	SemanticRelationship,
} from '@/features/semantic-memory/types/semantic-memory.types'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import { getCategoryMeta } from '@/features/health-knowledge/graph/metric-categories'

export function buildSemanticRelationships(input: {
	graph: HealthKnowledgeGraph
	personId: string
	metricHistories: MetricHistoryRecord[]
}): SemanticRelationship[] {
	const relationships: SemanticRelationship[] = []
	const { profile } = input.graph

	for (const history of input.metricHistories) {
		const metricEntityId = `metric:${history.canonicalId}`

		relationships.push({
			id: `rel-person-metric-${history.canonicalId}`,
			type: 'metric_belongs_to_person',
			fromEntityId: metricEntityId,
			toEntityId: `person:${input.personId}`,
			label: `${history.displayName} belongs to person`,
		})

		for (const reportId of history.linkedReportIds) {
			relationships.push({
				id: `rel-report-metric-${reportId}-${history.canonicalId}`,
				type: 'report_contains_metric',
				fromEntityId: `report:${reportId}`,
				toEntityId: metricEntityId,
				label: `Report contains ${history.displayName}`,
				sourceReportId: reportId,
			})
		}

		if (history.latestObservedAt) {
			relationships.push({
				id: `rel-metric-date-${history.canonicalId}-${history.latestObservedAt}`,
				type: 'metric_measured_on_date',
				fromEntityId: metricEntityId,
				toEntityId: `date:${history.latestObservedAt.slice(0, 10)}`,
				label: `${history.displayName} measured on ${history.latestObservedAt.slice(0, 10)}`,
			})
		}

		const categoryMeta = getCategoryMeta(history.categoryId as never)

		if (categoryMeta && isAbnormalStatus(history.latestStatus)) {
			relationships.push({
				id: `rel-finding-organ-${history.canonicalId}`,
				type: 'finding_references_organ',
				fromEntityId: `finding:${history.canonicalId}-latest`,
				toEntityId: `organ:${history.categoryId}`,
				label: `${history.displayName} references ${categoryMeta.name}`,
			})
		}
	}

	for (const relationship of profile.relationships) {
		relationships.push({
			id: `rel-metric-corr-${relationship.id}`,
			type: 'metric_correlates_with_metric',
			fromEntityId: `metric:${relationship.fromMetricId}`,
			toEntityId: `metric:${relationship.toMetricId}`,
			label: relationship.label,
		})
	}

	return relationships
}

export function buildSemanticEntities(input: {
	graph: HealthKnowledgeGraph
	metricHistories: MetricHistoryRecord[]
	hospitals: SemanticEntity[]
	doctors: SemanticEntity[]
}): SemanticEntity[] {
	const entities: SemanticEntity[] = [
		{
			id: `person:${input.graph.profile.personId}`,
			type: 'person',
			canonicalId: input.graph.profile.personId,
			label: 'Person',
			aliases: [],
			sourceReportIds: input.graph.profile.reportIds,
			firstSeenAt: null,
			lastSeenAt: null,
		},
		...input.hospitals,
		...input.doctors,
	]

	for (const history of input.metricHistories) {
		entities.push({
			id: `metric:${history.canonicalId}`,
			type: 'metric',
			canonicalId: history.canonicalId,
			label: history.displayName,
			aliases: [],
			sourceReportIds: history.linkedReportIds,
			firstSeenAt: history.previousObservedAt,
			lastSeenAt: history.latestObservedAt,
		})
	}

	for (const reportId of input.graph.profile.reportIds) {
		entities.push({
			id: `report:${reportId}`,
			type: 'report',
			canonicalId: reportId,
			label: `Report ${reportId}`,
			aliases: [],
			sourceReportIds: [reportId],
			firstSeenAt: null,
			lastSeenAt: null,
		})
	}

	return entities
}

function isAbnormalStatus(status: string): boolean {
	return ['low', 'high', 'critical', 'borderline'].includes(status)
}
