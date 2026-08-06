import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { HealthVisit } from '@/features/health/types/health-visit.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

export interface VisitChangeItem {
	id: string
	label: string
	tone: 'improved' | 'stable' | 'attention'
}

export function buildVisitChangeItems(
	visit: HealthVisit,
	graph: HealthKnowledgeGraph,
): VisitChangeItem[] {
	const reportIds = new Set(visit.reportIds)
	const items: VisitChangeItem[] = []

	for (const history of graph.profile.metricHistories) {
		const inVisit = history.observations.filter((observation) =>
			reportIds.has(observation.reportId),
		)

		if (inVisit.length === 0) {
			continue
		}

		const latestInVisit = inVisit[inVisit.length - 1]!
		const beforeVisit = history.observations.filter(
			(observation) => !reportIds.has(observation.reportId),
		)
		const prior = beforeVisit[beforeVisit.length - 1]

		if (!prior) {
			if (ABNORMAL.has(latestInVisit.status)) {
				items.push({
					id: `new-${history.canonicalMetricId}`,
					label: `${history.displayName} noted outside range`,
					tone: 'attention',
				})
			}

			continue
		}

		const wasAbnormal = ABNORMAL.has(prior.status)
		const isAbnormal = ABNORMAL.has(latestInVisit.status)

		if (wasAbnormal && latestInVisit.status === 'normal') {
			items.push({
				id: `improved-${history.canonicalMetricId}`,
				label: `${history.displayName} improved`,
				tone: 'improved',
			})
			continue
		}

		if (!wasAbnormal && isAbnormal) {
			items.push({
				id: `attention-${history.canonicalMetricId}`,
				label: `${history.displayName} needs attention`,
				tone: 'attention',
			})
			continue
		}

		if (latestInVisit.status === 'normal' && prior.status === 'normal') {
			items.push({
				id: `stable-${history.canonicalMetricId}`,
				label: `${history.displayName} stable`,
				tone: 'stable',
			})
		}
	}

	return items.slice(0, 5)
}

export function buildVisitChangesMap(
	visits: HealthVisit[],
	graph: HealthKnowledgeGraph,
): Record<string, VisitChangeItem[]> {
	const map: Record<string, VisitChangeItem[]> = {}

	for (const visit of visits) {
		map[visit.id] = buildVisitChangeItems(visit, graph)
	}

	return map
}
