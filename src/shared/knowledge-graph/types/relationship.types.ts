/** Explicit relationship types in the Chronicle Knowledge Graph. */
export type ChronicleRelationshipType =
	| 'owns'
	| 'belongs_to'
	| 'contains'
	| 'required_for'
	| 'covered_by'
	| 'covers'
	| 'held_in'
	| 'related_to'
	| 'measured_in'
	| 'correlates_with'
	| 'precedes'
	| 'follows'
	| 'references'
	| 'member_of'
	| 'has_task'
	| 'has_event'
	| 'depends_on'
	| 'created_from'
	| 'supports'
	| 'includes'
	| 'attached_to'
	| 'renews'
	| 'replaces'
	| 'supersedes'
	| 'used_by'
	| 'managed_by'
	| 'issued_by'

export interface ChronicleRelationship {
	id: string
	type: ChronicleRelationshipType
	fromEntityId: string
	toEntityId: string
	label: string
	domain: import('@/shared/knowledge-graph/types/entity.types').ChronicleDomain
	sourceProvider: string
	metadata?: Record<string, unknown>
}

export interface UpsertRelationshipInput {
	relationship: ChronicleRelationship
}

export interface FindRelatedQuery {
	entityId: string
	relationshipTypes?: ChronicleRelationshipType[]
	direction?: 'outgoing' | 'incoming' | 'both'
	entityTypes?: import('@/shared/knowledge-graph/types/entity.types').ChronicleEntityType[]
	limit?: number
}

export interface TraceQuery {
	fromEntityId: string
	toEntityId: string
	maxDepth?: number
	relationshipTypes?: ChronicleRelationshipType[]
}

export interface ExpandQuery {
	entityIds: string[]
	depth?: number
	relationshipTypes?: ChronicleRelationshipType[]
	entityTypes?: import('@/shared/knowledge-graph/types/entity.types').ChronicleEntityType[]
	maxEntities?: number
}
