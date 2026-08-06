import type { HealthMetric } from '@/features/health/domain/metric.types'

function metricKey(metric: HealthMetric): string {
	return (
		metric.canonicalId?.trim() || `raw:${metric.rawName.trim().toLowerCase()}`
	)
}

/** Merge layout parser metrics with AI metrics; AI wins on duplicate canonical IDs. */
export function mergeExtractedHealthMetrics(input: {
	layoutMetrics: HealthMetric[]
	aiMetrics: HealthMetric[]
}): HealthMetric[] {
	const merged = new Map<string, HealthMetric>()

	for (const metric of input.layoutMetrics) {
		merged.set(metricKey(metric), metric)
	}

	for (const metric of input.aiMetrics) {
		merged.set(metricKey(metric), metric)
	}

	return [...merged.values()]
}
