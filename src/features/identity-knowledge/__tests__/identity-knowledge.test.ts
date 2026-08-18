import { describe, expect, it } from 'vitest'
import {
	buildIdentityAttentionItems,
	buildIdentityKnowledge,
} from '@/features/identity-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

function createIdentityDocument(
	overrides: Partial<ChronicleDocument> = {},
): ChronicleDocument {
	return {
		id: overrides.id ?? 'doc-1',
		user_id: 'user-1',
		family_member_id: overrides.family_member_id ?? 'member-1',
		category_id: 'identity',
		sub_category_id: overrides.sub_category_id ?? 'passport',
		title: overrides.title ?? 'Passport',
		file_name: overrides.file_name ?? 'passport.pdf',
		storage_path: 'user-1/passport.pdf',
		mime_type: 'application/pdf',
		issue_date: overrides.issue_date ?? null,
		expiry_date: overrides.expiry_date ?? null,
		issuer: overrides.issuer ?? 'India',
		document_number: overrides.document_number ?? 'Z1234567',
		tags: [],
		notes: null,
		status: overrides.status ?? 'active',
		source: 'google-drive',
		connector_id: 'google-drive',
		external_file_id: 'ext-1',
		connector_registry_id: null,
		extracted_text: null,
		extracted_metadata: overrides.extracted_metadata ?? {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: '2026-01-01T00:00:00.000Z',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
	}
}

describe('buildIdentityKnowledge', () => {
	it('builds family wallets from identity documents', () => {
		const knowledge = buildIdentityKnowledge({
			userId: 'user-1',
			documents: [
				createIdentityDocument(),
				createIdentityDocument({
					id: 'doc-2',
					sub_category_id: 'pan',
					title: 'PAN',
					file_name: 'pan.pdf',
					expiry_date: null,
				}),
			],
			members: [
				{
					id: 'member-1',
					userId: 'user-1',
					familyId: null,
					displayName: 'Nivedan',
					relationship: 'self',
					isAccountOwner: true,
					roleId: 'adult',
					dateOfBirth: null,
					gender: null,
					status: 'active',
					avatarUrl: null,
					sortOrder: 0,
					createdAt: '',
					updatedAt: '',
					aliases: [],
				},
			],
			accountOwnerMemberId: 'member-1',
		})

		expect(knowledge.documentCount).toBe(2)
		expect(knowledge.memberWallets[0]?.primaryChips.length).toBeGreaterThan(0)
		expect(knowledge.documents[0]?.maskedDocumentNumber).toBe('•••• 4567')
	})

	it('creates attention only for expiring identity documents', () => {
		const soon = new Date()
		soon.setDate(soon.getDate() + 30)

		const attention = buildIdentityAttentionItems([
			{
				id: 'doc-1',
				chronicleDocumentId: 'doc-1',
				typeId: 'passport',
				typeLabel: 'Passport',
				ownerMemberId: 'member-1',
				ownerName: 'Nivedan',
				title: 'Passport',
				fileName: 'passport.pdf',
				documentNumber: 'Z1234567',
				maskedDocumentNumber: '•••• 4567',
				issueDate: null,
				expiryDate: soon.toISOString(),
				issuer: null,
				nationality: null,
				dateOfBirth: null,
				status: 'expires_soon',
				versionRole: 'current',
				consumerStatus: 'ready',
				summary: '',
				storagePath: '',
				mimeType: 'application/pdf',
				uploadedAt: '',
				folderPath: null,
				isPrimaryType: true,
			},
			{
				id: 'doc-2',
				chronicleDocumentId: 'doc-2',
				typeId: 'pan',
				typeLabel: 'PAN',
				ownerMemberId: 'member-1',
				ownerName: 'Nivedan',
				title: 'PAN',
				fileName: 'pan.pdf',
				documentNumber: 'ABCDE1234F',
				maskedDocumentNumber: '•••• 234F',
				issueDate: null,
				expiryDate: null,
				issuer: null,
				nationality: null,
				dateOfBirth: null,
				status: 'on_file',
				versionRole: 'current',
				consumerStatus: 'ready',
				summary: '',
				storagePath: '',
				mimeType: 'application/pdf',
				uploadedAt: '',
				folderPath: null,
				isPrimaryType: true,
			},
		])

		expect(attention).toHaveLength(1)
		expect(attention[0]?.typeLabel).toBe('Passport')
		expect(attention[0]?.subline).toMatch(/Expires in/)
	})
})
