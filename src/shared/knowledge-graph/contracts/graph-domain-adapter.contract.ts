import type { GraphStore } from '@/shared/knowledge-graph/store/graph-store'
import type { ChronicleEntity } from '@/shared/knowledge-graph/types/entity.types'

export interface GraphIngestResult {
	entityCount: number
	relationshipCount: number
}

/** Domain modules implement this to register entities and relationships. */
export interface GraphDomainAdapter<TInput = unknown> {
	readonly domain: ChronicleEntity['domain']
	readonly providerId: string
	readonly entityTypes: ChronicleEntity['type'][]
	ingest(store: GraphStore, input: TInput): GraphIngestResult
}
