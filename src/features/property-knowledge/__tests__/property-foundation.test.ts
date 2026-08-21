import { describe, expect, it } from 'vitest'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'
import {
	buildPropertyEntityKey,
	buildPropertyKnowledge,
	discoverPropertyNamesFromFolderPaths,
	resolvePropertyDocumentTypeId,
	resolvePropertyNameFromPath,
	runPropertyIntegrityAudit,
} from '@/features/property-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

function makePropertyDocument(input: {
	id: string
	fileName: string
	folderPath: string
	subCategoryId?: string | null
	title?: string
	familyMemberId?: string | null
	issueDate?: string | null
}): ChronicleDocument {
	return {
		id: input.id,
		user_id: 'user-1',
		title: input.title ?? input.fileName,
		file_name: input.fileName,
		category_id: 'property',
		sub_category_id: input.subCategoryId ?? null,
		status: 'active',
		family_member_id: input.familyMemberId ?? null,
		issue_date: input.issueDate ?? null,
		expiry_date: null,
		document_number: null,
		uploaded_at: '2026-06-01T00:00:00.000Z',
		extracted_metadata: { folderPath: input.folderPath },
		extracted_text: null,
		knowledge_refs: [],
		mime_type: 'application/pdf',
	} as ChronicleDocument
}

const MEMBERS = [
	{
		id: 'member-nivedan',
		userId: 'user-1',
		familyId: null,
		displayName: 'Nivedan',
		relationship: 'self',
		isAccountOwner: true,
		roleId: 'adult' as const,
		dateOfBirth: null,
		gender: null,
		status: 'active' as const,
		avatarUrl: null,
		sortOrder: 0,
		aliases: [],
		createdAt: '',
		updatedAt: '',
	},
]

describe('property folder resolver', () => {
	it('discovers nested property folders from one root assignment', () => {
		const names = discoverPropertyNamesFromFolderPaths(
			[
				'Home/Pune Home/Property Tax/receipt.pdf',
				'Home/Pune Home/Registration/deed.pdf',
				'Home/Nagpur Home/Purchase/agreement.pdf',
			],
			'Home',
		)

		expect(names.sort()).toEqual(['Nagpur Home', 'Pune Home'])
	})

	it('assigns nested files to a single root folder assignment', () => {
		const assignment = resolveModuleFolderAssignmentForFile(
			{ folderPath: 'Home/Pune Home/Property Tax/receipt.pdf' },
			[
				{
					id: 'assignment-1',
					externalFolderId: 'folder-home',
					folderName: 'Home',
					folderPath: 'Home',
				},
			],
		)

		expect(assignment?.folderName).toBe('Home')
	})
})

describe('property entity resolution', () => {
	it('merges two Pune Home documents into one property', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-sale',
					fileName: 'Pune Home Sale Agreement.pdf',
					folderPath: 'Home/Pune Home/Purchase',
					subCategoryId: 'sale-agreement',
					title: 'Pune Home Sale Agreement',
				}),
				makePropertyDocument({
					id: 'doc-tax',
					fileName: 'Pune Home Property Tax.pdf',
					folderPath: 'Home/Pune Home/Property Tax',
					subCategoryId: 'property-tax',
					title: 'Pune Home Property Tax',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		expect(knowledge.properties).toHaveLength(1)
		expect(knowledge.properties[0]?.displayName).toBe('Pune Home')
		expect(knowledge.properties[0]?.documentCount).toBe(2)
	})

	it('keeps Pune Home and Nagpur Home as separate properties', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-pune',
					fileName: 'agreement.pdf',
					folderPath: 'Home/Pune Home/Purchase',
				}),
				makePropertyDocument({
					id: 'doc-nagpur',
					fileName: 'agreement.pdf',
					folderPath: 'Home/Nagpur Home/Purchase',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		expect(knowledge.properties).toHaveLength(2)
		expect(
			knowledge.properties.map((property) => property.slug).sort(),
		).toEqual([
			buildPropertyEntityKey('Nagpur Home'),
			buildPropertyEntityKey('Pune Home'),
		])
	})
})

describe('property document classification', () => {
	it('classifies from folder and filename without over-reaching', () => {
		expect(
			resolvePropertyDocumentTypeId({
				subCategoryId: null,
				fileName: 'random-scan.pdf',
				folderPath: 'Home/Pune Home/Misc',
			}),
		).toBe('other')

		expect(
			resolvePropertyDocumentTypeId({
				subCategoryId: null,
				fileName: 'property tax receipt.pdf',
				folderPath: 'Home/Pune Home/Property Tax',
			}),
		).toBe('property-tax')
	})
})

describe('financial separation', () => {
	it('links home loan documents by reference only', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-loan',
					fileName: 'home loan sanction.pdf',
					folderPath: 'Home/Pune Home/Home Loan',
					subCategoryId: 'home-loan',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		const loanDocument = knowledge.documents[0]
		expect(loanDocument?.linkedFinanceLoanId).toMatch(/^reference-only:/)
		expect(
			knowledge.properties[0]?.references.some(
				(reference) => reference.kind === 'finance_loan',
			),
		).toBe(true)
	})
})

describe('property timeline', () => {
	it('uses document dates rather than upload-only operational events', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				makePropertyDocument({
					id: 'doc-registration',
					fileName: 'registration.pdf',
					folderPath: 'Home/Pune Home/Registration',
					subCategoryId: 'registration',
					issueDate: '2024-03-15',
				}),
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		expect(knowledge.timeline[0]?.eventType).toBe('registration_completed')
		expect(knowledge.timeline[0]?.eventDate).toBe('2024-03-15')
		expect(
			knowledge.timeline.some((event) => /upload/i.test(event.title)),
		).toBe(false)
	})
})

describe('property privacy', () => {
	it('masks registration numbers in document records', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [
				{
					...makePropertyDocument({
						id: 'doc-registration',
						fileName: 'registration.pdf',
						folderPath: 'Home/Pune Home/Registration',
						subCategoryId: 'registration',
					}),
					document_number: 'MH1234567890',
				} as ChronicleDocument,
			],
			members: MEMBERS,
			hasFolderAssigned: true,
			rootFolderPath: 'Home',
		})

		expect(knowledge.documents[0]?.maskedRegistrationNumber).toBe('•••• 7890')
		expect(knowledge.documents[0]?.maskedRegistrationNumber).not.toContain(
			'MH1234567890',
		)
	})
})

describe('property empty states', () => {
	it('returns not_connected when no folder is assigned', () => {
		const knowledge = buildPropertyKnowledge({
			userId: 'user-1',
			documents: [],
			members: MEMBERS,
			hasFolderAssigned: false,
		})

		expect(knowledge.setupStatus).toBe('not_connected')
		expect(knowledge.summary.headline).toContain('Connect your Home folder')
	})
})

describe('runPropertyIntegrityAudit', () => {
	it('reports a single property for duplicate-path documents', () => {
		const audit = runPropertyIntegrityAudit({
			userId: 'user-1',
			rootFolderPath: 'Home',
			documents: [
				makePropertyDocument({
					id: 'doc-sale',
					fileName: 'sale.pdf',
					folderPath: 'Home/Pune Home/Purchase',
				}),
				makePropertyDocument({
					id: 'doc-tax',
					fileName: 'tax.pdf',
					folderPath: 'Home/Pune Home/Property Tax',
				}),
			],
		})

		expect(audit.summary.propertiesCreated).toBe(1)
		expect(audit.findings.duplicateProperties).toEqual([])
		expect(audit.summary.financeReferenceOnlyLinks).toBe(0)
	})
})

describe('resolvePropertyNameFromPath', () => {
	it('extracts property folder segment under root', () => {
		expect(
			resolvePropertyNameFromPath({
				folderPath: 'Home/Pune Home/Property Tax',
				rootFolderPath: 'Home',
			}),
		).toBe('Pune Home')
	})
})
