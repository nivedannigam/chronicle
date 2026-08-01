import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type {
	ChronicleEntity,
	ChronicleEntityRef,
} from '@/shared/knowledge-graph/types/entity.types'
import type { ChronicleRelationship } from '@/shared/knowledge-graph/types/relationship.types'

export interface GraphSearchQuery {
	text: string
	types?: ChronicleEntity['type'][]
	domains?: ChronicleEntity['domain'][]
	memberId?: string | null
	limit?: number
}

export interface GraphSearchHit {
	entity: ChronicleEntity
	score: number
	matchedField: string
}

export interface GraphTraversalPath {
	entityIds: string[]
	relationshipIds: string[]
}

export interface GraphContextNode {
	entity: ChronicleEntity
	relationship?: ChronicleRelationship
	depth: number
}

export interface GraphContext {
	question: string
	intent?: ChronicleIntent
	seedEntities: ChronicleEntityRef[]
	entities: ChronicleEntity[]
	relationships: ChronicleRelationship[]
	nodes: GraphContextNode[]
	traversalTimeMs: number
	buildTimeMs: number
	linkedEntityIds: string[]
}

export interface BuildGraphContextInput {
	question: string
	intent?: ChronicleIntent
	seedEntityIds?: string[]
	metricIds?: string[]
	metricNames?: string[]
	memberId?: string | null
	maxDepth?: number
	maxEntities?: number
}

export interface GraphSnapshot {
	entityCount: number
	relationshipCount: number
	domains: string[]
	generatedAt: string
}

export interface GraphObservabilityMetrics {
	entityCount: number
	relationshipCount: number
	traversalTimeMs: number
	contextBuildTimeMs: number
	linkedEntities: number
	operation: string
}
