import {
	getCategoryDisplayMeta,
	getRelatedCategoryIds,
	getSubCategoryLabel,
} from '@/features/documents/constants/document-category-display'
import {
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type {
	ChronicleDocumentSummary,
	DocumentActivityItem,
	DocumentAttentionItem,
	DocumentDisplayField,
	DocumentIntelligenceView,
	DocumentRelatedItem,
	DocumentsHubView,
} from '@/features/documents/types/document-intelligence.types'

const MS_DAY = 1000 * 60 * 60 * 24

function formatDisplayDate(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return '—'

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function monthsUntil(isoDate: string): number | null {
	const date = new Date(isoDate)
	if (Number.isNaN(date.getTime())) return null
	return (date.getTime() - Date.now()) / (MS_DAY * 30)
}

function isExpiringSoon(document: ChronicleDocument): boolean {
	const months = document.expiry_date ? monthsUntil(document.expiry_date) : null
	return months !== null && months <= 12 && months >= 0
}

function isExpired(document: ChronicleDocument): boolean {
	if (!document.expiry_date) return false
	return new Date(document.expiry_date).getTime() < Date.now()
}

function fileTypeBadge(mimeType: string): string {
	if (mimeType.toLowerCase().includes('pdf')) return 'PDF'
	if (mimeType.toLowerCase().startsWith('image/')) return 'IMG'
	return 'DOC'
}

function sourceLabel(source: ChronicleDocument['source']): string {
	switch (source) {
		case 'google-drive':
			return 'Google Drive'
		case 'connector':
			return 'Connected import'
		default:
			return 'Uploaded'
	}
}

function readMetaString(
	metadata: Record<string, unknown>,
	key: string,
): string | null {
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

function ownerLabel(
	document: ChronicleDocument,
	memberNames: Record<string, string>,
): string {
	if (!document.family_member_id) {
		return 'Shared family'
	}

	return memberNames[document.family_member_id] ?? 'Family member'
}

export function buildDocumentSummary(document: ChronicleDocument): string {
	const category = getDocumentCategory(document.category_id)
	const sub = document.sub_category_id
		? getDocumentSubCategory(document.category_id, document.sub_category_id)
		: undefined
	const meta = document.extracted_metadata ?? {}
	const holder =
		readMetaString(meta, 'holderName') ??
		readMetaString(meta, 'holder_name') ??
		null
	const docType = sub?.label ?? category?.label ?? 'document'
	const parts: string[] = []

	parts.push(
		holder
			? `This ${docType.toLowerCase()} belongs to ${holder}.`
			: `This is a ${docType.toLowerCase()} in your Chronicle library.`,
	)

	if (document.issuer) {
		parts.push(`Issued by ${document.issuer}.`)
	}

	if (document.issue_date) {
		parts.push(`Issued on ${formatDisplayDate(document.issue_date)}.`)
	}

	if (document.expiry_date) {
		const months = monthsUntil(document.expiry_date)
		parts.push(`Expires on ${formatDisplayDate(document.expiry_date)}.`)

		if (months !== null && months < 0) {
			parts.push('This document has expired and may need renewal.')
		} else if (months !== null && months <= 6) {
			parts.push('Consider renewing before the expiry date.')
		} else {
			parts.push('No immediate action required.')
		}
	} else if (document.document_number) {
		parts.push(`Reference number ${document.document_number}.`)
		parts.push('No immediate action required.')
	} else {
		parts.push('Chronicle extracted key details from this document.')
	}

	return parts.join(' ')
}

export function buildDisplayFields(
	document: ChronicleDocument,
): DocumentDisplayField[] {
	const meta = document.extracted_metadata ?? {}
	const fields: DocumentDisplayField[] = []
	const sub = document.sub_category_id ?? ''

	const push = (label: string, value: string | null | undefined) => {
		if (value) fields.push({ label, value })
	}

	push('Document number', document.document_number)
	push(
		'Holder',
		readMetaString(meta, 'holderName') ?? readMetaString(meta, 'holder_name'),
	)
	push('Issuer', document.issuer)
	push(
		'Issue date',
		document.issue_date ? formatDisplayDate(document.issue_date) : null,
	)
	push(
		'Expiry date',
		document.expiry_date ? formatDisplayDate(document.expiry_date) : null,
	)
	push('Address', readMetaString(meta, 'address'))
	push('Nationality', readMetaString(meta, 'nationality'))
	push('Country', readMetaString(meta, 'country'))
	push('Policy number', readMetaString(meta, 'policy_number'))
	push('Coverage', readMetaString(meta, 'coverage'))
	push('Provider', readMetaString(meta, 'provider'))
	push('Hospital', readMetaString(meta, 'hospital'))
	push('Doctor', readMetaString(meta, 'doctor'))
	push('Registration', readMetaString(meta, 'registration'))

	if (sub.includes('passport')) {
		push('Passport number', document.document_number)
	}

	if (document.tags.length > 0) {
		push('Tags', document.tags.join(', '))
	}

	return fields.slice(0, 8)
}

function buildAttentionItems(
	documents: ChronicleDocument[],
): DocumentAttentionItem[] {
	const items: DocumentAttentionItem[] = []

	for (const document of documents) {
		if (isExpired(document)) {
			items.push({
				id: `expired-${document.id}`,
				documentId: document.id,
				title: `${document.title} has expired`,
				detail: `Expired on ${formatDisplayDate(document.expiry_date!)}. Review renewal options.`,
				kind: 'expired',
				severity: 'high',
			})
			continue
		}

		if (isExpiringSoon(document) && document.expiry_date) {
			const months = Math.max(1, Math.round(monthsUntil(document.expiry_date)!))
			items.push({
				id: `expiring-${document.id}`,
				documentId: document.id,
				title: `${document.title} expires in ${months} month${months === 1 ? '' : 's'}`,
				detail: 'Plan renewal before the expiry date.',
				kind: 'expiring_soon',
				severity: months <= 3 ? 'high' : 'medium',
			})
		}
	}

	const weekAgo = Date.now() - MS_DAY * 7

	for (const document of documents) {
		const uploaded = new Date(document.uploaded_at).getTime()
		if (uploaded >= weekAgo && items.length < 5) {
			items.push({
				id: `recent-${document.id}`,
				documentId: document.id,
				title: `Recently added: ${document.title}`,
				detail: `Added on ${formatDisplayDate(document.uploaded_at)}.`,
				kind: 'recently_added',
				severity: 'low',
			})
		}
	}

	return items
		.sort((a, b) => {
			const rank = { high: 0, medium: 1, low: 2 }
			return rank[a.severity] - rank[b.severity]
		})
		.slice(0, 5)
}

function buildActivityForDocument(
	document: ChronicleDocument,
): DocumentActivityItem[] {
	const events: DocumentActivityItem[] = []

	events.push({
		id: `uploaded-${document.id}`,
		documentId: document.id,
		title: document.title,
		summary: 'Added to Chronicle',
		timestamp: document.uploaded_at,
		displayDate: formatDisplayDate(document.uploaded_at),
		kind: 'uploaded',
	})

	if (document.updated_at !== document.created_at) {
		events.push({
			id: `updated-${document.id}`,
			documentId: document.id,
			title: document.title,
			summary: 'Document details updated',
			timestamp: document.updated_at,
			displayDate: formatDisplayDate(document.updated_at),
			kind: 'updated',
		})
	}

	if (
		document.extracted_text ||
		Object.keys(document.extracted_metadata).length > 0
	) {
		events.push({
			id: `processed-${document.id}`,
			documentId: document.id,
			title: document.title,
			summary: 'AI processed metadata and summary',
			timestamp: document.updated_at,
			displayDate: formatDisplayDate(document.updated_at),
			kind: 'processed',
		})
	}

	if (document.expiry_date && isExpired(document)) {
		events.push({
			id: `expired-event-${document.id}`,
			documentId: document.id,
			title: document.title,
			summary: 'Document expired',
			timestamp: document.expiry_date,
			displayDate: formatDisplayDate(document.expiry_date),
			kind: 'expired',
		})
	}

	return events
}

function buildRecentActivity(
	documents: ChronicleDocument[],
): DocumentActivityItem[] {
	return documents
		.flatMap((document) => buildActivityForDocument(document))
		.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
		.slice(0, 6)
}

export function findRelatedDocuments(
	document: ChronicleDocument,
	allDocuments: ChronicleDocument[],
): DocumentRelatedItem[] {
	const relatedCategoryIds = new Set(
		getRelatedCategoryIds(document.category_id),
	)
	const results: DocumentRelatedItem[] = []

	for (const candidate of allDocuments) {
		if (candidate.id === document.id) continue

		let reason: string | null = null

		if (candidate.category_id === document.category_id) {
			reason = `Same category · ${getCategoryDisplayMeta(candidate.category_id).label}`
		} else if (relatedCategoryIds.has(candidate.category_id)) {
			reason = `Often related · ${getCategoryDisplayMeta(candidate.category_id).label}`
		} else if (
			document.family_member_id &&
			candidate.family_member_id === document.family_member_id
		) {
			reason = 'Same owner'
		}

		if (!reason) continue

		results.push({
			id: candidate.id,
			title: candidate.title,
			categoryLabel: getCategoryDisplayMeta(candidate.category_id).label,
			reason,
		})
	}

	return results.slice(0, 4)
}

export function toDocumentSummary(
	document: ChronicleDocument,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary {
	const categoryMeta = getCategoryDisplayMeta(document.category_id)

	return {
		id: document.id,
		title: document.title,
		categoryId: document.category_id,
		categoryLabel: categoryMeta.label,
		subCategoryLabel: getSubCategoryLabel(
			document.category_id,
			document.sub_category_id,
		),
		ownerLabel: ownerLabel(document, memberNames),
		sourceLabel: sourceLabel(document.source),
		summary:
			buildDocumentSummary(document).split('. ').slice(0, 2).join('. ') + '.',
		displayDate: formatDisplayDate(document.issue_date ?? document.uploaded_at),
		expiresLabel: document.expiry_date
			? formatDisplayDate(document.expiry_date)
			: null,
		isExpiringSoon: isExpiringSoon(document),
		isExpired: isExpired(document),
		fileType: fileTypeBadge(document.mime_type),
		hasAiSummary: true,
	}
}

export function buildDocumentsHubView(input: {
	documents: ChronicleDocument[]
	memberNames?: Record<string, string>
}): DocumentsHubView {
	const memberNames = input.memberNames ?? {}
	const active = input.documents.filter(
		(document) => document.status !== 'failed',
	)
	const summaries = active.map((document) =>
		toDocumentSummary(document, memberNames),
	)

	const categoryCounts: Record<string, number> = {}
	for (const document of active) {
		categoryCounts[document.category_id] =
			(categoryCounts[document.category_id] ?? 0) + 1
	}

	const attention = buildAttentionItems(active)

	return {
		totalCount: active.length,
		attentionCount: attention.filter((item) => item.severity !== 'low').length,
		expiringCount: active.filter(isExpiringSoon).length,
		categoryCounts,
		attention,
		recentlyAdded: [...summaries]
			.sort(
				(a, b) =>
					Date.parse(
						active.find((document) => document.id === b.id)!.uploaded_at,
					) -
					Date.parse(
						active.find((document) => document.id === a.id)!.uploaded_at,
					),
			)
			.slice(0, 4),
		recentActivity: buildRecentActivity(active),
		allDocuments: summaries,
	}
}

export function buildDocumentIntelligenceView(input: {
	document: ChronicleDocument
	allDocuments: ChronicleDocument[]
}): DocumentIntelligenceView {
	return {
		documentId: input.document.id,
		summary: buildDocumentSummary(input.document),
		displayFields: buildDisplayFields(input.document),
		relatedDocuments: findRelatedDocuments(input.document, input.allDocuments),
		activity: buildActivityForDocument(input.document).sort(
			(a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
		),
	}
}

export function filterDocumentsByCategory(
	documents: ChronicleDocument[],
	categoryId: string,
): ChronicleDocument[] {
	return documents.filter((document) => document.category_id === categoryId)
}

export function searchDocumentsLocal(
	documents: ChronicleDocument[],
	query: string,
	memberNames: Record<string, string>,
): ChronicleDocument[] {
	const normalized = query.trim().toLowerCase()
	if (!normalized) return documents

	return documents.filter((document) => {
		const category = getDocumentCategory(document.category_id)
		const sub = document.sub_category_id
			? getDocumentSubCategory(document.category_id, document.sub_category_id)
			: undefined
		const owner = ownerLabel(document, memberNames)
		const haystack = [
			document.title,
			document.file_name,
			document.document_number,
			document.issuer,
			document.tags.join(' '),
			category?.label,
			sub?.label,
			owner,
			document.extracted_text,
			JSON.stringify(document.extracted_metadata),
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase()

		return haystack.includes(normalized)
	})
}
