import type { GraphObservabilityMetrics } from '@/shared/knowledge-graph/types/graph.types'

const metricsLog: GraphObservabilityMetrics[] = []

export function recordGraphOperation(
	metrics: GraphObservabilityMetrics,
): GraphObservabilityMetrics {
	metricsLog.push(metrics)

	if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
		console.debug('[chronicle-knowledge-graph]', metrics)
	}

	return metrics
}

export function getGraphObservabilityLog(): readonly GraphObservabilityMetrics[] {
	return metricsLog
}

export function clearGraphObservabilityLog(): void {
	metricsLog.length = 0
}
