export type KnowledgeItemType =
	| 'HealthReport'
	| 'HealthMetric'
	| 'Document'
	| 'Email'
	| 'Event'
	| 'Trip'
	| 'Vehicle'
	| 'Insurance'
	| 'Finance'
	| 'Task'
	| 'Photo'

export type KnowledgeSource =
	| 'health'
	| 'mail'
	| 'tasks'
	| 'documents'
	| 'calendar'
	| 'finance'
	| 'travel'
	| 'manual'
	| 'system'

export interface KnowledgeItem {
	id: string
	userId: string
	type: KnowledgeItemType
	title: string
	summary: string
	source: KnowledgeSource
	sourceId: string
	tags: string[]
	confidence: number
	createdAt: string
	updatedAt: string
	metadata: Record<string, unknown>
}

export interface CreateKnowledgeItemInput {
	userId: string
	type: KnowledgeItemType
	title: string
	summary: string
	source: KnowledgeSource
	sourceId: string
	tags?: string[]
	confidence?: number
	metadata?: Record<string, unknown>
}

export interface UpdateKnowledgeItemInput {
	title?: string
	summary?: string
	tags?: string[]
	confidence?: number
	metadata?: Record<string, unknown>
}

export interface KnowledgeSearchParams {
	userId: string
	query?: string
	types?: KnowledgeItemType[]
	tags?: string[]
	limit?: number
}

export interface KnowledgeSearchResult {
	items: KnowledgeItem[]
	query: string
	/** Platform stub — full search not yet implemented */
	implementation: 'mock-filter'
}

export interface KnowledgeTimelineEntry {
	id: string
	time: string
	event: string
	color: string
	type: KnowledgeItemType
	source: KnowledgeSource
}

export const KNOWLEDGE_ITEM_TYPES: KnowledgeItemType[] = [
	'HealthReport',
	'HealthMetric',
	'Document',
	'Email',
	'Event',
	'Trip',
	'Vehicle',
	'Insurance',
	'Finance',
	'Task',
	'Photo',
]
