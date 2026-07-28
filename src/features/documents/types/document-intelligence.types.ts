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

export interface DocumentIntelligenceView {
	documentId: string
	summary: string
	displayFields: DocumentDisplayField[]
	relatedDocuments: DocumentRelatedItem[]
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
}

export type { ChronicleDocument }
