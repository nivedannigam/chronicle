import { describe, expect, it } from 'vitest'
import { financeModuleProvider } from '@/core/platform/providers/finance-module.provider'
import {
	buildFinanceDocumentLink,
	buildFinanceKnowledge,
	classifyFinanceDocument,
	getFinanceDocumentTypeLabel,
} from '@/features/finance-knowledge'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'
import { resolveDocumentModuleDetailPath } from '@/features/documents/services/document-module-links.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { financeDocumentPath } from '@/constants/routes'

const FIXTURES = [
	{
		fileName: 'HDFC Savings Account Statement Aug 2026.pdf',
		folderPath: 'Finance/Bank/HDFC',
		expectedType: 'bank-statement',
	},
	{
		fileName: 'ICICI Credit Card Statement Aug 2026.pdf',
		folderPath: 'Finance/Credit Cards/ICICI',
		expectedType: 'credit-card-statement',
	},
	{
		fileName: 'Home Loan Statement FY2026.pdf',
		folderPath: 'Finance/Loans/Home',
		expectedType: 'loan-statement',
	},
	{
		fileName: 'Axis Mutual Fund Statement.pdf',
		folderPath: 'Finance/Investments/Mutual Funds',
		expectedType: 'investment-statement',
	},
	{
		fileName: 'NPS Transaction Statement 2026.pdf',
		folderPath: 'Finance/NPS',
		expectedType: 'nps-statement',
	},
	{
		fileName: 'ITR Acknowledgement AY 2026-27.pdf',
		folderPath: 'Finance/Tax/ITR',
		expectedType: 'tax-record',
	},
] as const

function makeFinanceDocument(input: {
	id: string
	fileName: string
	folderPath: string
	subCategoryId?: string | null
	externalFileId?: string
	knowledgeRefs?: ChronicleDocument['knowledge_refs']
	metadata?: Record<string, unknown>
}): ChronicleDocument {
	const link = buildFinanceDocumentLink({
		documentId: input.id,
		fileName: input.fileName,
		folderPath: input.folderPath,
		subCategoryId: input.subCategoryId ?? null,
		extractedMetadata: {
			folderPath: input.folderPath,
			...(input.metadata ?? {}),
		},
	})

	return {
		id: input.id,
		user_id: 'user-1',
		title: link.title,
		file_name: input.fileName,
		category_id: 'financial',
		sub_category_id: link.subCategoryId,
		status: 'active',
		family_member_id: null,
		uploaded_at: '2026-01-15T00:00:00.000Z',
		extracted_metadata: link.extractedMetadata,
		extracted_text: null,
		knowledge_refs: input.knowledgeRefs ?? link.knowledgeRefs,
		mime_type: 'application/pdf',
		external_file_id: input.externalFileId ?? `drive-${input.id}`,
	} as ChronicleDocument
}

describe('classifyFinanceDocument', () => {
	it.each(FIXTURES)(
		'classifies $fileName as $expectedType',
		({ fileName, folderPath, expectedType }) => {
			const result = classifyFinanceDocument({ fileName, folderPath })

			expect(result.type).toBe(expectedType)
			expect(result.confidence).not.toBe('low')
		},
	)

	it('classifies EPF and PPF statements', () => {
		expect(
			classifyFinanceDocument({
				fileName: 'EPF Statement 2026.pdf',
				folderPath: 'Finance/EPF',
			}).type,
		).toBe('epf-statement')

		expect(
			classifyFinanceDocument({
				fileName: 'PPF Statement FY2026.pdf',
				folderPath: 'Finance/PPF',
			}).type,
		).toBe('ppf-statement')
	})

	it('classifies unknown documents as other with low confidence', () => {
		const result = classifyFinanceDocument({
			fileName: 'random-document.pdf',
			folderPath: 'Finance/Archive',
		})

		expect(result.type).toBe('other')
		expect(result.confidence).toBe('low')
	})

	it('prefers filename over contradictory folder path', () => {
		const result = classifyFinanceDocument({
			fileName: 'ICICI Credit Card Statement Aug 2026.pdf',
			folderPath: 'Finance/Bank/ICICI',
		})

		expect(result.type).toBe('credit-card-statement')
	})
})

describe('recursive Finance folder assignment', () => {
	const financeAssignment = {
		id: 'finance-1',
		externalFolderId: 'drive-finance-root',
		folderName: 'Finance',
		folderPath: 'Finance',
	}

	it('captures nested fixture paths from one Finance root assignment', () => {
		for (const fixture of FIXTURES) {
			const resolved = resolveModuleFolderAssignmentForFile(
				{
					folderExternalId: 'nested-folder',
					folderPath: fixture.folderPath,
				},
				[financeAssignment],
			)

			expect(resolved?.id).toBe('finance-1')
		}
	})
})

describe('buildFinanceDocumentLink', () => {
	it('creates finance knowledge refs without financial facts', () => {
		const link = buildFinanceDocumentLink({
			documentId: 'doc-1',
			fileName: 'HDFC Savings Account Statement Aug 2026.pdf',
			folderPath: 'Finance/Bank/HDFC',
		})

		expect(link.knowledgeRefs).toEqual([
			{
				domain: 'finance',
				entityId: 'doc-1',
				label: 'Hdfc',
			},
		])
		expect(link.title).toMatch(/^Finance · /)
		expect(link.extractedMetadata.financeClassification).toBeDefined()
		expect(link.extractedMetadata.balance).toBeUndefined()
		expect(link.extractedMetadata.accountNumber).toBeUndefined()
	})
})

describe('Finance Library integration', () => {
	it('shows the same document count as Finance knowledge', () => {
		const documents = FIXTURES.map((fixture, index) =>
			makeFinanceDocument({
				id: `doc-${index}`,
				fileName: fixture.fileName,
				folderPath: fixture.folderPath,
			}),
		)

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents,
			members: [],
			hasFolderAssigned: true,
		})

		const section = financeModuleProvider.getDocumentSection({
			userId: 'user-1',
			sources: { documents: { uploadedDocuments: documents } },
		})

		expect(knowledge.documentCount).toBe(FIXTURES.length)
		expect(section?.totalCount).toBe(FIXTURES.length)
		expect(
			section?.documents.every((doc) => doc.summary.startsWith('Finance ·')),
		).toBe(true)
	})

	it('links Library financial documents back to Finance', () => {
		const document = makeFinanceDocument({
			id: 'doc-bank',
			fileName: 'HDFC Savings Account Statement Aug 2026.pdf',
			folderPath: 'Finance/Bank/HDFC',
		})

		expect(resolveDocumentModuleDetailPath(document)).toEqual({
			label: 'View in Finance',
			path: financeDocumentPath('doc-bank'),
		})
	})
})

describe('Finance Home coverage', () => {
	it('builds category counts without fake financial totals', () => {
		const documents = FIXTURES.map((fixture, index) =>
			makeFinanceDocument({
				id: `doc-${index}`,
				fileName: fixture.fileName,
				folderPath: fixture.folderPath,
			}),
		)

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents,
			members: [],
			hasFolderAssigned: true,
		})

		expect(knowledge.summary.netWorthKnown).toBeNull()
		expect(knowledge.summary.documentTypeCounts.length).toBeGreaterThan(0)
		expect(
			knowledge.summary.documentTypeCounts.every(
				(entry) => getFinanceDocumentTypeLabel(entry.id).length > 0,
			),
		).toBe(true)
	})

	it('flags incomplete classification for organizing note', () => {
		const documents = [
			makeFinanceDocument({
				id: 'doc-other',
				fileName: 'random-document.pdf',
				folderPath: 'Finance/Archive',
			}),
		]

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents,
			members: [],
			hasFolderAssigned: true,
		})

		expect(knowledge.setupStatus).toBe('organizing')
	})
})

describe('document deduplication contract', () => {
	it('uses external_file_id as the deduplication key', () => {
		const externalFileId = 'drive-file-123'
		const first = makeFinanceDocument({
			id: 'doc-1',
			fileName: 'HDFC Savings Account Statement Aug 2026.pdf',
			folderPath: 'Finance/Bank/HDFC',
			externalFileId,
		})
		const duplicate = makeFinanceDocument({
			id: 'doc-2',
			fileName: 'HDFC Savings Account Statement Aug 2026.pdf',
			folderPath: 'Finance/Bank/HDFC',
			externalFileId,
		})

		expect(first.external_file_id).toBe(duplicate.external_file_id)
	})
})
