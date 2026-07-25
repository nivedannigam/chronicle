import { describe, expect, it } from 'vitest'
import { detectIntent } from '@/features/ask/retrieval/intent-detector'
import { extractDocumentMetadata } from '@/features/documents/extraction/document-metadata.engine'
import {
	inferDocumentCategory,
	resolveCategoryFromQuery,
} from '@/features/documents/types/document-categories'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { documentsKnowledgeRetriever } from '@/features/knowledge/retrieval/documents-knowledge-retriever'
import { DocumentsKnowledgeProvider } from '@/features/intelligence/providers/documents-knowledge.provider'

function createDocument(
	overrides: Partial<ChronicleDocument> = {},
): ChronicleDocument {
	return {
		id: 'doc-1',
		user_id: 'user-1',
		family_member_id: 'member-1',
		category_id: 'identity',
		sub_category_id: 'passport',
		title: 'Passport (N1234567)',
		file_name: 'passport.pdf',
		storage_path: 'user-1/doc-1_passport.pdf',
		mime_type: 'application/pdf',
		issue_date: '2020-01-15',
		expiry_date: '2030-06-30',
		issuer: 'Passport Office',
		document_number: 'N1234567',
		tags: ['travel'],
		notes: null,
		status: 'active',
		source: 'upload',
		connector_id: null,
		external_file_id: null,
		connector_registry_id: null,
		extracted_text: 'Passport Number N1234567 Expiry Date 30/06/2030',
		extracted_metadata: {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: '2026-01-10T10:00:00.000Z',
		created_at: '2026-01-10T10:00:00.000Z',
		updated_at: '2026-01-10T10:00:00.000Z',
		...overrides,
	}
}

describe('document metadata extraction', () => {
	it('extracts passport fields from OCR text without hardcoding document type', () => {
		const metadata = extractDocumentMetadata({
			fileName: 'passport_scan.pdf',
			text: [
				'Passport Number N1234567',
				'Issue Date 15/01/2020',
				'Expiry Date 30/06/2030',
				'Issued by Passport Office India',
				'Name John Doe',
			].join('\n'),
		})

		expect(metadata.categoryId).toBe('identity')
		expect(metadata.subCategoryId).toBe('passport')
		expect(metadata.documentNumber).toBe('N1234567')
		expect(metadata.issueDate).toBe('2020-01-15')
		expect(metadata.expiryDate).toBe('2030-06-30')
		expect(metadata.issuer).toContain('Passport Office')
		expect(metadata.holderName).toBe('John Doe')
	})

	it('infers insurance category from file name', () => {
		const inferred = inferDocumentCategory({
			fileName: 'health_insurance_policy.pdf',
		})

		expect(inferred.categoryId).toBe('insurance')
	})
})

describe('document intent detection', () => {
	it('detects passport expiry questions', () => {
		const result = detectIntent('When does my passport expire?')

		expect(result.intent).toBe('document_expiry')
	})

	it('detects document listing questions', () => {
		const result = detectIntent('Show all documents for my daughter')

		expect(result.intent).toBe('list_documents')
	})

	it('detects specific document lookup', () => {
		const result = detectIntent('My PAN card')

		expect(result.intent).toBe('find_document')
		expect(resolveCategoryFromQuery('My PAN card')).toBe('identity')
	})

	it('detects insurance category questions', () => {
		const result = detectIntent('Which insurance policies do I have?')

		expect(result.intent).toBe('general_documents')
		expect(result.categoryId).toBe('insurance')
	})
})

describe('documents knowledge retriever', () => {
	it('returns expiry summary for document_expiry intent', () => {
		const knowledge = documentsKnowledgeRetriever.retrieve({
			userId: 'user-1',
			question: 'Which documents expire this year?',
			intent: 'document_expiry',
			resolvedQuestion: 'Which documents expire this year?',
			documents: [
				createDocument(),
				createDocument({
					id: 'doc-2',
					title: 'Driving Licence',
					expiry_date: `${new Date().getFullYear()}-12-01`,
					sub_category_id: 'driving-licence',
				}),
			],
			member: {
				memberId: 'member-1',
				memberName: 'Alex',
				familyMemberNames: ['Alex'],
			},
		})

		expect(knowledge.domain).toBe('documents')
		expect(knowledge.reports.length).toBeGreaterThan(0)
		expect(knowledge.summaryLines.some((line) => /expiring/i.test(line))).toBe(
			true,
		)
	})

	it('filters documents by member', () => {
		const knowledge = documentsKnowledgeRetriever.retrieve({
			userId: 'user-1',
			question: 'List documents',
			intent: 'list_documents',
			resolvedQuestion: 'List documents',
			documents: [
				createDocument({ family_member_id: 'member-1' }),
				createDocument({
					id: 'doc-other',
					family_member_id: 'member-2',
					title: 'Other member passport',
				}),
			],
			member: {
				memberId: 'member-1',
				memberName: 'Alex',
				familyMemberNames: ['Alex'],
			},
		})

		expect(knowledge.reports).toHaveLength(1)
		expect(knowledge.reports[0]?.title).toContain('Passport')
	})
})

describe('documents knowledge provider', () => {
	const provider = new DocumentsKnowledgeProvider()

	it('supports queries when uploaded documents exist', () => {
		const query = {
			userId: 'user-1',
			question: 'When does my passport expire?',
			resolvedQuestion: 'When does my passport expire?',
			intent: 'document_expiry' as const,
			sources: {
				documents: {
					uploadedDocuments: [createDocument()],
					connectorDocuments: [],
				},
			},
			member: {
				memberId: 'member-1',
				memberName: 'Alex',
				familyMemberNames: ['Alex'],
			},
		}

		expect(provider.supports(query)).toBe(true)

		const hits = provider.search(query)

		expect(hits.some((hit) => hit.title.includes('Passport'))).toBe(true)

		const context = provider.retrieveContext(query)

		expect(context.available).toBe(true)
		expect(context.package?.summaryLines.length).toBeGreaterThan(0)
	})

	it('returns unavailable when no documents are present', () => {
		const context = provider.retrieveContext({
			userId: 'user-1',
			question: 'Show my passport',
			resolvedQuestion: 'Show my passport',
			intent: 'find_document',
			sources: {},
			member: {
				memberId: null,
				memberName: null,
				familyMemberNames: [],
			},
		})

		expect(context.available).toBe(false)
	})
})
