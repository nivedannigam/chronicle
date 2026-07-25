import { mergeDocumentsWithConnectorRecords } from '@/features/documents/services/document-import.service'
import { documentsExpiringWithin } from '@/features/documents/services/document.service'
import {
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { topReportIdsFromHits } from '@/features/intelligence/services/search-ranking.service'
import type {
	KnowledgeRetriever,
	RetrievalQuery,
	RetrievedKnowledge,
	RetrievedReport,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'

function formatDate(value: string | null | undefined): string {
	if (!value) {
		return '—'
	}

	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function toRetrievedReport(document: ChronicleDocument): RetrievedReport {
	const category = getDocumentCategory(document.category_id)
	const sub = document.sub_category_id
		? getDocumentSubCategory(document.category_id, document.sub_category_id)
		: undefined

	return {
		id: document.id,
		title: document.title,
		date: document.issue_date ?? document.uploaded_at,
		lab: document.issuer ?? category?.label ?? 'Document',
		category: sub?.label ?? category?.label ?? document.category_id,
		summary: [
			document.document_number ? `Number: ${document.document_number}` : null,
			document.expiry_date
				? `Expires: ${formatDate(document.expiry_date)}`
				: null,
			document.tags.length ? `Tags: ${document.tags.join(', ')}` : null,
		]
			.filter(Boolean)
			.join(' · '),
	}
}

function filterDocuments(input: {
	documents: ChronicleDocument[]
	memberId?: string | null
	categoryId?: string
	searchReportIds?: Set<string>
	intent: RetrievalQuery['intent']
	resolvedQuestion: string
}): ChronicleDocument[] {
	let filtered = input.documents.filter(
		(document) => document.status !== 'failed',
	)

	if (input.memberId) {
		filtered = filtered.filter(
			(document) =>
				document.family_member_id === input.memberId ||
				document.family_member_id == null,
		)
	}

	if (input.categoryId) {
		filtered = filtered.filter(
			(document) => document.category_id === input.categoryId,
		)
	}

	if (input.searchReportIds?.size) {
		const ranked = filtered.filter((document) =>
			input.searchReportIds!.has(document.id),
		)

		if (ranked.length > 0) {
			filtered = ranked
		}
	}

	if (input.intent === 'document_expiry') {
		const thisYear = new Date().getFullYear()
		filtered = filtered.filter((document) => {
			if (!document.expiry_date) {
				return false
			}

			if (/this year/i.test(input.resolvedQuestion)) {
				return new Date(document.expiry_date).getFullYear() === thisYear
			}

			return documentsExpiringWithin([document], 365).length > 0
		})
	}

	return filtered
}

function buildSummaryLines(input: {
	intent: RetrievalQuery['intent']
	documents: ChronicleDocument[]
	memberName?: string | null
}): string[] {
	const prefix = input.memberName ? `${input.memberName}'s ` : 'Your '
	const lines: string[] = []

	if (input.documents.length === 0) {
		return [`${prefix}document library has no matching records yet.`]
	}

	switch (input.intent) {
		case 'document_expiry': {
			const expiring = documentsExpiringWithin(input.documents, 365)

			if (expiring.length === 0) {
				lines.push(
					`${prefix}documents have no upcoming expiries in the next year.`,
				)
			} else {
				lines.push(
					`${expiring.length} document${expiring.length === 1 ? '' : 's'} expiring within the next year.`,
				)

				for (const document of expiring.slice(0, 4)) {
					lines.push(
						`${document.title} expires ${formatDate(document.expiry_date)}.`,
					)
				}
			}

			break
		}
		case 'find_document': {
			const match = input.documents[0]!

			lines.push(`Found ${match.title}.`)

			if (match.expiry_date) {
				lines.push(`Expires ${formatDate(match.expiry_date)}.`)
			}

			break
		}
		case 'list_documents':
			lines.push(
				`${prefix}Chronicle library contains ${input.documents.length} matching document${input.documents.length === 1 ? '' : 's'}.`,
			)

			for (const document of input.documents.slice(0, 5)) {
				lines.push(
					`${document.title} (${formatDate(document.issue_date ?? document.uploaded_at)}).`,
				)
			}

			break
		default:
			lines.push(
				`${prefix}Chronicle has ${input.documents.length} document${input.documents.length === 1 ? '' : 's'} available for this question.`,
			)
	}

	return lines
}

function buildTimelineInsights(documents: ChronicleDocument[]): string[] {
	return documents
		.filter((document) => document.issue_date || document.expiry_date)
		.slice(0, 6)
		.map((document) => {
			if (document.expiry_date) {
				return `${document.title} expires ${formatDate(document.expiry_date)}`
			}

			return `${document.title} issued ${formatDate(document.issue_date)}`
		})
}

export class DocumentsKnowledgeRetriever implements KnowledgeRetriever {
	readonly domain = 'documents' as const

	retrieve(query: RetrievalQuery): RetrievedKnowledge {
		const uploaded = query.documents ?? []
		const connectorRecords = query.connectorDocuments ?? []
		const merged = mergeDocumentsWithConnectorRecords({
			documents: uploaded,
			connectorRecords,
		})

		const searchReportIds = new Set(
			topReportIdsFromHits(query.searchHits ?? []),
		)
		const filtered = filterDocuments({
			documents: merged,
			memberId: query.member?.memberId,
			categoryId: query.documentCategoryId ?? query.categoryId,
			searchReportIds,
			intent: query.intent,
			resolvedQuestion: query.resolvedQuestion,
		})

		const reports = filtered.map(toRetrievedReport)
		const expiringSoon = documentsExpiringWithin(filtered, 90)
		const alerts = expiringSoon.map(
			(document) =>
				`${document.title} expires ${formatDate(document.expiry_date)}`,
		)

		return {
			domain: 'documents',
			intent: query.intent,
			reports,
			metrics: [],
			timelines: [],
			trends: [],
			observations: [],
			relationships: [],
			insights: buildTimelineInsights(filtered),
			alerts,
			summaryLines: buildSummaryLines({
				intent: query.intent,
				documents: filtered,
				memberName: query.member?.memberName,
			}),
			comparisons: [],
		}
	}
}

export const documentsKnowledgeRetriever = new DocumentsKnowledgeRetriever()
