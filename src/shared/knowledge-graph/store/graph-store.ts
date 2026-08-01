import type { ChronicleEntity } from '@/shared/knowledge-graph/types/entity.types'
import type { ChronicleRelationship } from '@/shared/knowledge-graph/types/relationship.types'
import type { GraphSnapshot } from '@/shared/knowledge-graph/types/graph.types'

export class GraphStore {
	private readonly entities = new Map<string, ChronicleEntity>()
	private readonly relationships = new Map<string, ChronicleRelationship>()
	private readonly outgoing = new Map<string, Set<string>>()
	private readonly incoming = new Map<string, Set<string>>()

	upsertEntity(entity: ChronicleEntity): void {
		this.entities.set(entity.id, entity)
	}

	upsertRelationship(relationship: ChronicleRelationship): void {
		this.relationships.set(relationship.id, relationship)

		if (!this.outgoing.has(relationship.fromEntityId)) {
			this.outgoing.set(relationship.fromEntityId, new Set())
		}

		if (!this.incoming.has(relationship.toEntityId)) {
			this.incoming.set(relationship.toEntityId, new Set())
		}

		this.outgoing.get(relationship.fromEntityId)!.add(relationship.id)
		this.incoming.get(relationship.toEntityId)!.add(relationship.id)
	}

	getEntity(id: string): ChronicleEntity | undefined {
		return this.entities.get(id)
	}

	getRelationship(id: string): ChronicleRelationship | undefined {
		return this.relationships.get(id)
	}

	listEntities(): ChronicleEntity[] {
		return [...this.entities.values()]
	}

	listRelationships(): ChronicleRelationship[] {
		return [...this.relationships.values()]
	}

	outgoingRelationshipIds(entityId: string): string[] {
		return [...(this.outgoing.get(entityId) ?? [])]
	}

	incomingRelationshipIds(entityId: string): string[] {
		return [...(this.incoming.get(entityId) ?? [])]
	}

	snapshot(): GraphSnapshot {
		const domains = new Set<string>()

		for (const entity of this.entities.values()) {
			domains.add(entity.domain)
		}

		return {
			entityCount: this.entities.size,
			relationshipCount: this.relationships.size,
			domains: [...domains],
			generatedAt: new Date().toISOString(),
		}
	}

	clear(): void {
		this.entities.clear()
		this.relationships.clear()
		this.outgoing.clear()
		this.incoming.clear()
	}
}

export const defaultGraphStore = new GraphStore()
