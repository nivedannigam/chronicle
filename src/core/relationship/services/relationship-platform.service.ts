import {
	getRegisteredRelationshipProviders,
	getRegisteredRelationshipProviderIds,
	registerRelationshipProvider,
} from '@/core/relationship/registries/relationship-provider-registry'
import {
	defaultKnowledgeGraphService,
	KnowledgeGraphService,
} from '@/shared/knowledge-graph/services/knowledge-graph.service'
import type { GraphDomainAdapter } from '@/shared/knowledge-graph/contracts/graph-domain-adapter.contract'
import type {
	BuildGraphContextInput,
	GraphContext,
	GraphSearchQuery,
	GraphSnapshot,
} from '@/shared/knowledge-graph/types/graph.types'
import type {
	ExpandQuery,
	FindRelatedQuery,
} from '@/shared/knowledge-graph/types/relationship.types'
import type {
	FindEntityQuery,
	ChronicleEntity,
} from '@/shared/knowledge-graph/types/entity.types'

export interface RelationshipPlatformIngestInput {
	health?: import('@/features/health-knowledge/types/health-knowledge-object.types').HealthKnowledge
	insurance?: import('@/features/insurance-knowledge/types/insurance-knowledge-object.types').InsuranceKnowledge
	documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
}

export class RelationshipPlatformService {
	private readonly graph: KnowledgeGraphService

	constructor(graph: KnowledgeGraphService = defaultKnowledgeGraphService) {
		this.graph = graph
	}

	registerProvider(adapter: GraphDomainAdapter): void {
		registerRelationshipProvider(adapter)
		this.graph.registerAdapter(adapter)
	}

	ingestAll(input: RelationshipPlatformIngestInput): GraphSnapshot {
		if (input.health) {
			this.graph.loadHealthKnowledge(input.health)
		}

		if (input.insurance) {
			this.graph.loadInsuranceKnowledge(input.insurance)
		}

		if (input.documents?.length) {
			this.graph.loadDocuments({ documents: input.documents })
		}

		return this.graph.snapshot()
	}

	findEntity(query: FindEntityQuery): ChronicleEntity[] {
		return this.graph.findEntity(query)
	}

	findRelated(
		query: FindRelatedQuery,
	): Array<{
		entity: ChronicleEntity
		relationship: import('@/shared/knowledge-graph/types/relationship.types').ChronicleRelationship
	}> {
		return this.graph.findRelated(query)
	}

	search(query: GraphSearchQuery) {
		return this.graph.search(query)
	}

	expand(query: ExpandQuery) {
		return this.graph.expand(query)
	}

	buildContext(input: BuildGraphContextInput): GraphContext {
		return this.graph.buildContext(input)
	}

	snapshot(): GraphSnapshot {
		return this.graph.snapshot()
	}

	getRegisteredProviderIds(): string[] {
		return getRegisteredRelationshipProviderIds()
	}

	getRegisteredProviders(): GraphDomainAdapter[] {
		return getRegisteredRelationshipProviders()
	}
}

export const defaultRelationshipPlatformService =
	new RelationshipPlatformService()

export function ingestChronicleRelationships(
	input: RelationshipPlatformIngestInput,
): GraphSnapshot {
	return defaultRelationshipPlatformService.ingestAll(input)
}
