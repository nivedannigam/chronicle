import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type { GraphStore } from '@/shared/knowledge-graph/store/graph-store'
import type {
	BuildGraphContextInput,
	GraphContext,
} from '@/shared/knowledge-graph/types/graph.types'
import type { ChronicleEntity } from '@/shared/knowledge-graph/types/entity.types'
import {
	expandGraph,
	findEntities,
	searchGraph,
} from '@/shared/knowledge-graph/services/graph-traversal'

const INTENT_SEED_TYPES: Partial<
	Record<ChronicleIntent, Array<ChronicleEntity['type']>>
> = {
	GENERAL_HEALTH_SUMMARY: ['FamilyMember', 'HealthReport', 'HealthMetric'],
	LATEST_REPORT: ['HealthReport'],
	ABNORMAL_RESULTS: ['HealthMetric'],
	NORMAL_RESULTS: ['HealthMetric'],
	SPECIFIC_METRIC: ['HealthMetric'],
	TREND_ANALYSIS: ['HealthMetric', 'TimelineEvent'],
	COMPARE_REPORTS: ['HealthReport', 'HealthMetric'],
	RECOMMENDATIONS: ['Recommendation', 'HealthMetric'],
	FOLLOW_UP_TESTS: ['Recommendation'],
	EXPLAIN_METRIC: ['HealthMetric', 'HealthCategory'],
	UNKNOWN: ['HealthReport'],
}

function resolveSeedEntityIds(
	store: GraphStore,
	input: BuildGraphContextInput,
): string[] {
	if (input.seedEntityIds?.length) {
		return input.seedEntityIds
	}

	const seeds = new Set<string>()
	const intentTypes = input.intent ? INTENT_SEED_TYPES[input.intent] : undefined

	if (input.metricIds?.length) {
		for (const metricId of input.metricIds) {
			const matches = findEntities(store, {
				type: 'HealthMetric',
				labelContains: metricId,
				limit: 4,
			})

			for (const entity of matches) {
				seeds.add(entity.id)
			}

			const canonicalMatches = store
				.listEntities()
				.filter(
					(entity) =>
						entity.type === 'HealthMetric' &&
						String(entity.metadata.canonicalId ?? '') === metricId,
				)

			for (const entity of canonicalMatches) {
				seeds.add(entity.id)
			}
		}
	}

	if (input.metricNames?.length) {
		for (const name of input.metricNames) {
			const hits = searchGraph(store, {
				text: name,
				types: ['HealthMetric'],
				memberId: input.memberId,
				limit: 4,
			})

			for (const hit of hits) {
				seeds.add(hit.entity.id)
			}
		}
	}

	if (input.question.trim()) {
		const hits = searchGraph(store, {
			text: input.question,
			types: intentTypes,
			memberId: input.memberId,
			limit: 6,
		})

		for (const hit of hits) {
			seeds.add(hit.entity.id)
		}
	}

	if (seeds.size === 0 && intentTypes) {
		const fallback = findEntities(store, {
			type: intentTypes,
			memberId: input.memberId,
			limit: 4,
		})

		for (const entity of fallback) {
			seeds.add(entity.id)
		}
	}

	if (seeds.size === 0) {
		const reports = findEntities(store, {
			type: 'HealthReport',
			memberId: input.memberId,
			limit: 1,
		})

		for (const entity of reports) {
			seeds.add(entity.id)
		}
	}

	return [...seeds]
}

export function buildGraphContext(
	store: GraphStore,
	input: BuildGraphContextInput,
): GraphContext {
	const buildStartedAt = Date.now()
	const traversalStartedAt = Date.now()

	const seedEntityIds = resolveSeedEntityIds(store, input)
	const expanded = expandGraph(store, {
		entityIds: seedEntityIds,
		depth: input.maxDepth ?? 2,
		maxEntities: input.maxEntities ?? 32,
	})

	const traversalTimeMs = Math.max(1, Date.now() - traversalStartedAt)
	const seedEntities = seedEntityIds
		.map((id) => store.getEntity(id))
		.filter((entity): entity is ChronicleEntity => entity != null)
		.map((entity) => ({
			id: entity.id,
			type: entity.type,
			label: entity.label,
		}))

	const nodes = expanded.entities.map((entity) => ({
		entity,
		depth: seedEntityIds.includes(entity.id) ? 0 : 1,
	}))

	return {
		question: input.question,
		intent: input.intent,
		seedEntities,
		entities: expanded.entities,
		relationships: expanded.relationships,
		nodes,
		traversalTimeMs,
		buildTimeMs: Math.max(1, Date.now() - buildStartedAt),
		linkedEntityIds: expanded.entities.map((entity) => entity.id),
	}
}
