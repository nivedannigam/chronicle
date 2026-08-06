import type { ChronicleDocument } from '@/features/documents/types/document.types'

export type DocumentAttentionKind =
	'expiring_soon' | 'expired' | 'recently_added' | 'renewal_due' | 'review'

export interface DocumentAttentionItem {
	id: string
	documentId: string
	title: string
	detail: string
	kind: DocumentAttentionKind
	severity: 'high' | 'medium' | 'low'
}

export interface DocumentActivityItem {
	id: string
	documentId: string
	title: string
	summary: string
	timestamp: string
	displayDate: string
	kind:
		'uploaded' | 'updated' | 'renewed' | 'expired' | 'reviewed' | 'processed'
}

export interface DocumentDisplayField {
	label: string
	value: string
}

export interface DocumentRelatedItem {
	id: string
	title: string
	categoryLabel: string
	reason: string
}

export interface DocumentModuleLinkView {
	moduleId: string
	label: string
	route: string | null
}

export interface DocumentAiDiscoveryItem {
	id: string
	documentId: string
	title: string
	label: string
	categoryLabel: string
}

export type DocumentConsumerStatus = 'Ready' | 'Needs Help' | 'Still Organizing'

export interface DocumentIntelligenceView {
	documentId: string
	summary: string
	displayFields: DocumentDisplayField[]
	relatedDocuments: DocumentRelatedItem[]
	relatedModules: DocumentModuleLinkView[]
	aiDiscoveryLabel: string | null
	activity: DocumentActivityItem[]
}

export interface ChronicleDocumentSummary {
	id: string
	title: string
	categoryId: string
	categoryLabel: string
	subCategoryLabel: string | null
	ownerLabel: string
	sourceLabel: string
	summary: string
	displayDate: string
	expiresLabel: string | null
	isExpiringSoon: boolean
	isExpired: boolean
	fileType: string
	hasAiSummary: boolean
	tags: string[]
	relatedModules: DocumentModuleLinkView[]
	consumerStatus: DocumentConsumerStatus
	aiDiscoveryLabel: string | null
	year: number | null
}

export interface DocumentsHubView {
	totalCount: number
	attentionCount: number
	expiringCount: number
	categoryCounts: Record<string, number>
	attention: DocumentAttentionItem[]
	recentlyAdded: ChronicleDocumentSummary[]
	recentActivity: DocumentActivityItem[]
	allDocuments: ChronicleDocumentSummary[]
	expiringSoon: ChronicleDocumentSummary[]
	aiDiscoveries: DocumentAiDiscoveryItem[]
	needsAttention: ChronicleDocumentSummary[]
}

export interface DocumentLibraryFilters {
	query: string
	categoryId: string | null
	familyMemberId: string | null
	subCategoryId: string | null
	year: number | null
	source: ChronicleDocument['source'] | null
	consumerStatus: DocumentConsumerStatus | null
}

export type { ChronicleDocument }
