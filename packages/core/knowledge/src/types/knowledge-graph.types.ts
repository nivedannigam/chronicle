/** Generic knowledge graph primitives — domain modules extend these. */

export interface KnowledgeEntity {
	id: string
	type: string
	label: string
	sourceProvider: string
	metadata?: Record<string, string>
}

export interface KnowledgeRelationshipEdge {
	id: string
	type: string
	fromEntityId: string
	toEntityId: string
	label: string
	sourceProvider: string
}

export interface KnowledgeTimelineEventRecord {
	id: string
	date: string
	label: string
	kind: string
	entityId?: string
	categoryId?: string
	documentId?: string
	evidence?: string
}

export interface KnowledgeGraph<TProfile = unknown> {
	domain: import('./knowledge-domain.types.ts').KnowledgeDomain
	profile: TProfile
	generatedAt: string
}
