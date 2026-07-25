import type { ChronicleDocument } from '@/features/documents/types/document.types'
import {
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'
import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'
import { registerTimelineProvider } from '@/features/timeline/registry/timeline-registry'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'

const PROVIDER_ID = 'documents'

function getDocuments(query: TimelineProviderQuery): ChronicleDocument[] {
	return query.sources.documents?.uploadedDocuments ?? []
}

function resolveDocumentEventType(
	document: ChronicleDocument,
): ChronicleTimelineEvent['eventType'] {
	const sub = document.sub_category_id ?? ''
	const category = document.category_id
	const text = `${document.title} ${document.file_name}`.toLowerCase()

	if (category === 'insurance' && document.issue_date) {
		return 'insurance_purchased'
	}

	if (
		category === 'property' &&
		(sub === 'registration' || /registr/i.test(text))
	) {
		return 'property_registered'
	}

	if (document.expiry_date && !document.issue_date) {
		return 'document_expiry'
	}

	if (/renew/i.test(text) && document.issue_date) {
		return 'document_renewed'
	}

	if (document.issue_date) {
		return 'document_issued'
	}

	return 'document_uploaded'
}

function buildDocumentTitle(
	document: ChronicleDocument,
	eventType: ChronicleTimelineEvent['eventType'],
): string {
	const sub = document.sub_category_id
		? getDocumentSubCategory(document.category_id, document.sub_category_id)
		: undefined
	const label = sub?.label ?? getDocumentCategory(document.category_id)?.label

	switch (eventType) {
		case 'insurance_purchased':
			return `${label ?? 'Insurance'} purchased`
		case 'property_registered':
			return 'Property registered'
		case 'document_renewed':
			return `${label ?? 'Document'} renewed`
		case 'document_expiry':
			return `${label ?? 'Document'} expiry approaching`
		case 'document_issued':
			return `${label ?? 'Document'} issued`
		default:
			return 'Document added to library'
	}
}

function documentEvent(
	document: ChronicleDocument,
	eventType: ChronicleTimelineEvent['eventType'],
	timestamp: string,
	importance: ChronicleTimelineEvent['importance'] = 'medium',
): ChronicleTimelineEvent | null {
	if (document.status === 'failed') {
		return null
	}

	const category = getDocumentCategory(document.category_id)

	return {
		id: `documents-${eventType}-${document.id}-${timestamp}`,
		timestamp,
		eventType,
		title: buildDocumentTitle(document, eventType),
		summary: [
			document.title,
			document.document_number ? `No. ${document.document_number}` : null,
			document.issuer ? `Issuer: ${document.issuer}` : null,
		]
			.filter(Boolean)
			.join(' · '),
		familyMemberId: document.family_member_id,
		sourceModule: 'documents',
		relatedAssets: [
			{
				type: 'document',
				id: document.id,
				label: document.title,
			},
		],
		tags: [
			'documents',
			document.category_id,
			document.sub_category_id ?? '',
			...document.tags,
		].filter(Boolean),
		importance,
		references: [
			{
				type: 'document',
				id: document.id,
				label: document.title,
			},
		],
		metadata: {
			category: category?.label ?? document.category_id,
			source: document.source,
			documentNumber: document.document_number ?? '',
		},
	}
}

export class DocumentsTimelineProvider implements ChronicleTimelineProvider {
	readonly id = PROVIDER_ID
	readonly module = 'documents' as const
	readonly label = 'Documents'
	readonly priority = 20

	supports(query: TimelineProviderQuery): boolean {
		return getDocuments(query).length > 0
	}

	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[] {
		const events: ChronicleTimelineEvent[] = []

		for (const document of getDocuments(query)) {
			const primaryType = resolveDocumentEventType(document)

			if (document.issue_date) {
				const issued = documentEvent(
					document,
					primaryType === 'document_uploaded' ? 'document_issued' : primaryType,
					document.issue_date,
					primaryType === 'insurance_purchased' ? 'high' : 'medium',
				)

				if (issued) {
					events.push(issued)
				}
			}

			const uploaded = documentEvent(
				document,
				'document_uploaded',
				document.uploaded_at,
				'low',
			)

			if (uploaded && !document.issue_date) {
				events.push(uploaded)
			}

			if (document.expiry_date) {
				const expiry = documentEvent(
					document,
					'document_expiry',
					document.expiry_date,
					'high',
				)

				if (expiry) {
					events.push(expiry)
				}
			}
		}

		return events
	}
}

export const documentsTimelineProvider = new DocumentsTimelineProvider()

registerTimelineProvider(documentsTimelineProvider)
