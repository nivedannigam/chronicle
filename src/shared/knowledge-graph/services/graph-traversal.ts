import type { FindEntityQuery } from '@/shared/knowledge-graph/types/entity.types'
import type {
	ExpandQuery,
	FindRelatedQuery,
	TraceQuery,
} from '@/shared/knowledge-graph/types/relationship.types'
import type {
	GraphSearchHit,
	GraphSearchQuery,
	GraphTraversalPath,
} from '@/shared/knowledge-graph/types/graph.types'
import type { GraphStore } from '@/shared/knowledge-graph/store/graph-store'
import type { ChronicleEntity } from '@/shared/knowledge-graph/types/entity.types'
import type { ChronicleRelationship } from '@/shared/knowledge-graph/types/relationship.types'

function normalizeTypes(
	type?: ChronicleEntity['type'] | ChronicleEntity['type'][],
): Set<ChronicleEntity['type']> | null {
	if (!type) {
		return null
	}

	return new Set(Array.isArray(type) ? type : [type])
}

export function findEntities(
	store: GraphStore,
	query: FindEntityQuery,
): ChronicleEntity[] {
	let results = store.listEntities()

	if (query.id) {
		const entity = store.getEntity(query.id)
		return entity ? [entity] : []
	}

	const typeSet = normalizeTypes(query.type)

	if (typeSet) {
		results = results.filter((entity) => typeSet.has(entity.type))
	}

	if (query.domain) {
		results = results.filter((entity) => entity.domain === query.domain)
	}

	if (query.memberId !== undefined) {
		results = results.filter((entity) => entity.memberId === query.memberId)
	}

	if (query.labelContains) {
		const needle = query.labelContains.toLowerCase()
		results = results.filter((entity) =>
			entity.label.toLowerCase().includes(needle),
		)
	}

	if (query.limit != null) {
		results = results.slice(0, query.limit)
	}

	return results
}

export function searchGraph(
	store: GraphStore,
	query: GraphSearchQuery,
): GraphSearchHit[] {
	const needle = query.text.trim().toLowerCase()
	const typeSet = query.types ? new Set(query.types) : null
	const domainSet = query.domains ? new Set(query.domains) : null
	const hits: GraphSearchHit[] = []

	for (const entity of store.listEntities()) {
		if (typeSet && !typeSet.has(entity.type)) {
			continue
		}

		if (domainSet && !domainSet.has(entity.domain)) {
			continue
		}

		if (query.memberId !== undefined && entity.memberId !== query.memberId) {
			continue
		}

		const label = entity.label.toLowerCase()
		const canonicalId = String(entity.metadata.canonicalId ?? '').toLowerCase()
		const displayName = String(entity.metadata.displayName ?? '').toLowerCase()

		let score = 0
		let matchedField = ''

		if (needle && label.includes(needle)) {
			score = Math.max(score, 0.9)
			matchedField = 'label'
		}

		if (needle && canonicalId.includes(needle)) {
			score = Math.max(score, 0.95)
			matchedField = 'canonicalId'
		}

		if (needle && displayName.includes(needle)) {
			score = Math.max(score, 0.92)
			matchedField = 'displayName'
		}

		if (score > 0) {
			hits.push({ entity, score, matchedField })
		}
	}

	return hits.sort((a, b) => b.score - a.score).slice(0, query.limit ?? 20)
}

export function findRelatedEntities(
	store: GraphStore,
	query: FindRelatedQuery,
): Array<{ entity: ChronicleEntity; relationship: ChronicleRelationship }> {
	const entity = store.getEntity(query.entityId)

	if (!entity) {
		return []
	}

	const direction = query.direction ?? 'both'
	const relTypeSet = query.relationshipTypes
		? new Set(query.relationshipTypes)
		: null
	const entityTypeSet = query.entityTypes ? new Set(query.entityTypes) : null
	const results: Array<{
		entity: ChronicleEntity
		relationship: ChronicleRelationship
	}> = []

	const relationshipIds = [
		...(direction === 'incoming'
			? []
			: store.outgoingRelationshipIds(query.entityId)),
		...(direction === 'outgoing'
			? []
			: store.incomingRelationshipIds(query.entityId)),
	]

	for (const relationshipId of relationshipIds) {
		const relationship = store.getRelationship(relationshipId)

		if (!relationship) {
			continue
		}

		if (relTypeSet && !relTypeSet.has(relationship.type)) {
			continue
		}

		const relatedId =
			relationship.fromEntityId === query.entityId
				? relationship.toEntityId
				: relationship.fromEntityId
		const relatedEntity = store.getEntity(relatedId)

		if (!relatedEntity) {
			continue
		}

		if (entityTypeSet && !entityTypeSet.has(relatedEntity.type)) {
			continue
		}

		results.push({ entity: relatedEntity, relationship })
	}

	return results.slice(0, query.limit ?? 50)
}

export function expandGraph(
	store: GraphStore,
	query: ExpandQuery,
): {
	entities: ChronicleEntity[]
	relationships: ChronicleRelationship[]
} {
	const depthLimit = query.depth ?? 2
	const maxEntities = query.maxEntities ?? 40
	const relTypeSet = query.relationshipTypes
		? new Set(query.relationshipTypes)
		: null
	const entityTypeSet = query.entityTypes ? new Set(query.entityTypes) : null

	const visitedEntities = new Set<string>()
	const visitedRelationships = new Set<string>()
	const queue: Array<{ entityId: string; depth: number }> = query.entityIds.map(
		(entityId) => ({ entityId, depth: 0 }),
	)

	const entities: ChronicleEntity[] = []
	const relationships: ChronicleRelationship[] = []

	while (queue.length > 0 && entities.length < maxEntities) {
		const current = queue.shift()!

		if (visitedEntities.has(current.entityId)) {
			continue
		}

		const entity = store.getEntity(current.entityId)

		if (!entity) {
			continue
		}

		if (entityTypeSet && !entityTypeSet.has(entity.type)) {
			continue
		}

		visitedEntities.add(current.entityId)
		entities.push(entity)

		if (current.depth >= depthLimit) {
			continue
		}

		for (const relationshipId of [
			...store.outgoingRelationshipIds(current.entityId),
			...store.incomingRelationshipIds(current.entityId),
		]) {
			if (visitedRelationships.has(relationshipId)) {
				continue
			}

			const relationship = store.getRelationship(relationshipId)

			if (!relationship) {
				continue
			}

			if (relTypeSet && !relTypeSet.has(relationship.type)) {
				continue
			}

			visitedRelationships.add(relationshipId)
			relationships.push(relationship)

			const nextEntityId =
				relationship.fromEntityId === current.entityId
					? relationship.toEntityId
					: relationship.fromEntityId

			if (!visitedEntities.has(nextEntityId)) {
				queue.push({ entityId: nextEntityId, depth: current.depth + 1 })
			}
		}
	}

	return { entities, relationships }
}

export function traceGraph(
	store: GraphStore,
	query: TraceQuery,
): GraphTraversalPath | null {
	const maxDepth = query.maxDepth ?? 6
	const relTypeSet = query.relationshipTypes
		? new Set(query.relationshipTypes)
		: null

	const queue: Array<{
		entityId: string
		pathEntityIds: string[]
		pathRelationshipIds: string[]
	}> = [
		{
			entityId: query.fromEntityId,
			pathEntityIds: [query.fromEntityId],
			pathRelationshipIds: [],
		},
	]

	while (queue.length > 0) {
		const current = queue.shift()!

		if (current.entityId === query.toEntityId) {
			return {
				entityIds: current.pathEntityIds,
				relationshipIds: current.pathRelationshipIds,
			}
		}

		if (current.pathEntityIds.length > maxDepth) {
			continue
		}

		for (const relationshipId of store.outgoingRelationshipIds(
			current.entityId,
		)) {
			const relationship = store.getRelationship(relationshipId)

			if (!relationship) {
				continue
			}

			if (relTypeSet && !relTypeSet.has(relationship.type)) {
				continue
			}

			if (current.pathRelationshipIds.includes(relationshipId)) {
				continue
			}

			const nextEntityId = relationship.toEntityId

			if (current.pathEntityIds.includes(nextEntityId)) {
				continue
			}

			queue.push({
				entityId: nextEntityId,
				pathEntityIds: [...current.pathEntityIds, nextEntityId],
				pathRelationshipIds: [...current.pathRelationshipIds, relationshipId],
			})
		}
	}

	return null
}
