import {
	getMetricRelationships,
	getRelationshipsForMetric,
} from '@/features/health-knowledge/graph/metric-relationships'
import type { MetricRelationship } from '@/features/health-knowledge/types'

export function getAllMetricRelationships(): MetricRelationship[] {
	return getMetricRelationships()
}

export function findRelationshipsForMetric(
	metricId: string,
): MetricRelationship[] {
	return getRelationshipsForMetric(metricId)
}

export function findRelatedMetricIds(metricId: string): string[] {
	const related = new Set<string>()

	for (const relationship of getRelationshipsForMetric(metricId)) {
		if (relationship.fromMetricId === metricId) {
			related.add(relationship.toMetricId)
		} else {
			related.add(relationship.fromMetricId)
		}
	}

	return [...related].filter((id) => !id.endsWith('-category'))
}
