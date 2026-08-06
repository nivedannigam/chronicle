import {
	defaultGraphStore,
	GraphStore,
} from '@/shared/knowledge-graph/store/graph-store'
import { buildGraphContext } from '@/shared/knowledge-graph/services/context-builder'
import {
	expandGraph,
	findEntities,
	findRelatedEntities,
	searchGraph,
	traceGraph,
} from '@/shared/knowledge-graph/services/graph-traversal'
import { recordGraphOperation } from '@/shared/knowledge-graph/observability/graph-observability'
import type { GraphDomainAdapter } from '@/shared/knowledge-graph/contracts/graph-domain-adapter.contract'
import type {
	FindEntityQuery,
	ChronicleEntity,
} from '@/shared/knowledge-graph/types/entity.types'
import type {
	ChronicleRelationship,
	ExpandQuery,
	FindRelatedQuery,
	TraceQuery,
} from '@/shared/knowledge-graph/types/relationship.types'
import type {
	BuildGraphContextInput,
	GraphContext,
	GraphSearchQuery,
	GraphSnapshot,
} from '@/shared/knowledge-graph/types/graph.types'

export class KnowledgeGraphService {
	private readonly store: GraphStore
	private readonly adapters = new Map<string, GraphDomainAdapter>()

	constructor(store: GraphStore = defaultGraphStore) {
		this.store = store
	}

	registerAdapter(adapter: GraphDomainAdapter): void {
		this.adapters.set(adapter.domain, adapter)
	}

	upsertEntity(entity: ChronicleEntity): void {
		this.store.upsertEntity(entity)
	}

	upsertRelationship(relationship: ChronicleRelationship): void {
		this.store.upsertRelationship(relationship)
	}

	findEntity(query: FindEntityQuery): ChronicleEntity[] {
		const startedAt = Date.now()
		const results = findEntities(this.store, query)
		this.record('findEntity', startedAt, results.length)
		return results
	}

	findRelated(
		query: FindRelatedQuery,
	): Array<{ entity: ChronicleEntity; relationship: ChronicleRelationship }> {
		const startedAt = Date.now()
		const results = findRelatedEntities(this.store, query)
		this.record('findRelated', startedAt, results.length)
		return results
	}

	search(query: GraphSearchQuery) {
		const startedAt = Date.now()
		const results = searchGraph(this.store, query)
		this.record('search', startedAt, results.length)
		return results
	}

	expand(query: ExpandQuery) {
		const startedAt = Date.now()
		const results = expandGraph(this.store, query)
		this.record('expand', startedAt, results.entities.length)
		return results
	}

	trace(query: TraceQuery) {
		const startedAt = Date.now()
		const results = traceGraph(this.store, query)
		this.record('trace', startedAt, results?.entityIds.length ?? 0)
		return results
	}

	buildContext(input: BuildGraphContextInput): GraphContext {
		const context = buildGraphContext(this.store, input)

		recordGraphOperation({
			entityCount: this.store.snapshot().entityCount,
			relationshipCount: this.store.snapshot().relationshipCount,
			traversalTimeMs: context.traversalTimeMs,
			contextBuildTimeMs: context.buildTimeMs,
			linkedEntities: context.linkedEntityIds.length,
			operation: 'buildContext',
		})

		return context
	}

	ingestDomain<TInput>(domain: string, input: TInput): GraphSnapshot {
		const adapter = this.adapters.get(domain)

		if (!adapter) {
			throw new Error(`No graph adapter registered for domain "${domain}".`)
		}

		const startedAt = Date.now()
		adapter.ingest(this.store, input)
		const snapshot = this.store.snapshot()

		recordGraphOperation({
			entityCount: snapshot.entityCount,
			relationshipCount: snapshot.relationshipCount,
			traversalTimeMs: 0,
			contextBuildTimeMs: Math.max(1, Date.now() - startedAt),
			linkedEntities: snapshot.entityCount,
			operation: `ingest:${domain}`,
		})

		return snapshot
	}

	loadHealthKnowledge(
		input: import('@/features/health-knowledge/types/health-knowledge-object.types').HealthKnowledge,
	): GraphSnapshot {
		return this.ingestDomain('health', input)
	}

	loadInsuranceKnowledge(
		input: import('@/features/insurance-knowledge/types/insurance-knowledge-object.types').InsuranceKnowledge,
	): GraphSnapshot {
		return this.ingestDomain('insurance', input)
	}

	loadDocuments(
		input: import('@/shared/knowledge-graph/adapters/documents-graph.adapter').DocumentsGraphInput,
	): GraphSnapshot {
		return this.ingestDomain('documents', input)
	}

	snapshot(): GraphSnapshot {
		return this.store.snapshot()
	}

	clear(): void {
		this.store.clear()
	}

	private record(
		operation: string,
		startedAt: number,
		linkedEntities: number,
	): void {
		const snapshot = this.store.snapshot()

		recordGraphOperation({
			entityCount: snapshot.entityCount,
			relationshipCount: snapshot.relationshipCount,
			traversalTimeMs: Math.max(1, Date.now() - startedAt),
			contextBuildTimeMs: Math.max(1, Date.now() - startedAt),
			linkedEntities,
			operation,
		})
	}
}

export const defaultKnowledgeGraphService = new KnowledgeGraphService()
