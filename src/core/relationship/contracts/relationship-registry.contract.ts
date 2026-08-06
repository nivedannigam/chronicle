export type {
	ChronicleRelationship,
	ChronicleRelationshipType,
	FindRelatedQuery,
	ExpandQuery,
	TraceQuery,
} from '@/shared/knowledge-graph/types/relationship.types'

export interface RelationshipResolveInput {
	domain: string
	relationshipType: string
	fromEntityType: string
	toEntityType: string
}

export interface ResolvedRelationshipType {
	canonicalType: import('@/shared/knowledge-graph/types/relationship.types').ChronicleRelationshipType
	label: string
}
