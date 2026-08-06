export interface InsuranceKnowledgeBuildMetrics {
	buildDurationMs: number
	policiesProcessed: number
	documentsProcessed: number
	activePolicyCount: number
	expiringCount: number
	timelineEvents: number
	confidenceOverall: number
	userId: string
	familyMemberId: string | null
}

export function logInsuranceKnowledgeBuild(
	metrics: InsuranceKnowledgeBuildMetrics,
): void {
	if (import.meta.env.PROD) {
		console.info('[insurance-knowledge] build_complete', {
			buildDurationMs: metrics.buildDurationMs,
			policiesProcessed: metrics.policiesProcessed,
			documentsProcessed: metrics.documentsProcessed,
			activePolicyCount: metrics.activePolicyCount,
			expiringCount: metrics.expiringCount,
			timelineEvents: metrics.timelineEvents,
			confidenceOverall: metrics.confidenceOverall,
			userId: hashId(metrics.userId),
			familyMemberId: metrics.familyMemberId
				? hashId(metrics.familyMemberId)
				: null,
		})
		return
	}

	console.debug('[insurance-knowledge] build_complete', metrics)
}

function hashId(value: string): string {
	let hash = 0

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(index)
		hash |= 0
	}

	return `id_${Math.abs(hash).toString(16)}`
}
