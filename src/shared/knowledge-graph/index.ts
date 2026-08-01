import { healthGraphAdapter } from '@/shared/knowledge-graph/adapters/health-graph.adapter'
import {
	defaultKnowledgeGraphService,
	KnowledgeGraphService,
} from '@/shared/knowledge-graph/services/knowledge-graph.service'

defaultKnowledgeGraphService.registerAdapter(healthGraphAdapter)

export {
	KnowledgeGraphService,
	defaultKnowledgeGraphService,
	healthGraphAdapter,
}

export type { GraphDomainAdapter } from '@/shared/knowledge-graph/adapters/health-graph.adapter'

export type {
	ChronicleEntity,
	ChronicleEntityType,
	ChronicleDomain,
	FindEntityQuery,
} from '@/shared/knowledge-graph/types/entity.types'

export type {
	ChronicleRelationship,
	ChronicleRelationshipType,
	FindRelatedQuery,
	ExpandQuery,
	TraceQuery,
} from '@/shared/knowledge-graph/types/relationship.types'

export type {
	GraphContext,
	GraphSearchQuery,
	GraphSearchHit,
	GraphSnapshot,
	BuildGraphContextInput,
	GraphObservabilityMetrics,
} from '@/shared/knowledge-graph/types/graph.types'

export {
	recordGraphOperation,
	getGraphObservabilityLog,
	clearGraphObservabilityLog,
} from '@/shared/knowledge-graph/observability/graph-observability'

export {
	graphContextToEvidence,
	mergeGraphAndToolEvidence,
} from '@/shared/knowledge-graph/services/graph-context-to-evidence'

export { ingestHealthKnowledge } from '@/shared/knowledge-graph/adapters/health-graph.adapter'
