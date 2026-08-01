export interface HealthKnowledgeBuildMetrics {
	buildDurationMs: number
	reportsProcessed: number
	metricsLoaded: number
	abnormalCount: number
	criticalCount: number
	timelineEvents: number
	confidenceOverall: number
	userId: string
	familyMemberId: string | null
}

export function logHealthKnowledgeBuild(
	metrics: HealthKnowledgeBuildMetrics,
): void {
	if (import.meta.env.PROD) {
		console.info('[health-knowledge] build_complete', {
			buildDurationMs: metrics.buildDurationMs,
			reportsProcessed: metrics.reportsProcessed,
			metricsLoaded: metrics.metricsLoaded,
			abnormalCount: metrics.abnormalCount,
			criticalCount: metrics.criticalCount,
			timelineEvents: metrics.timelineEvents,
			confidenceOverall: metrics.confidenceOverall,
			userId: hashId(metrics.userId),
			familyMemberId: metrics.familyMemberId
				? hashId(metrics.familyMemberId)
				: null,
		})
		return
	}

	console.debug('[health-knowledge] build_complete', metrics)
}

function hashId(value: string): string {
	let hash = 0

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(index)
		hash |= 0
	}

	return `id_${Math.abs(hash).toString(16)}`
}
