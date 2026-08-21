import { describe, expect, it } from 'vitest'
import '@/features/identity/providers/identity-intelligence.provider'
import { buildIdentityKnowledge } from '@/features/identity-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { identityIntelligenceProvider } from '@/features/identity/providers/identity-intelligence.provider'

function createIdentityDocument(
	overrides: Partial<ChronicleDocument> = {},
): ChronicleDocument {
	return {
		id: overrides.id ?? 'doc-passport',
		user_id: 'user-1',
		family_member_id: overrides.family_member_id ?? 'member-nivedan',
		category_id: 'identity',
		sub_category_id: overrides.sub_category_id ?? 'passport',
		title: overrides.title ?? 'Passport',
		file_name: overrides.file_name ?? 'passport.pdf',
		storage_path: 'user-1/passport.pdf',
		mime_type: 'application/pdf',
		issue_date: null,
		expiry_date: null,
		issuer: 'India',
		document_number: 'N1234567',
		tags: [],
		notes: null,
		status: 'active',
		source: 'google-drive',
		connector_id: 'google-drive',
		external_file_id: 'ext-1',
		connector_registry_id: null,
		extracted_text: null,
		extracted_metadata: {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: '2026-01-01T00:00:00.000Z',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
	}
}

const members = [
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

describe('identityIntelligenceProvider', () => {
	it('searches canonical identity people and documents', () => {
		const knowledge = buildIdentityKnowledge({
			userId: 'user-1',
			documents: [
				createIdentityDocument(),
				createIdentityDocument({
					id: 'doc-aadhaar',
					sub_category_id: 'aadhaar',
					title: 'Aadhaar',
					file_name: 'aadhaar.pdf',
				}),
			],
			members,
			accountOwnerMemberId: 'member-nivedan',
		})

		const hits = identityIntelligenceProvider.search({
			userId: 'user-1',
			question: 'Nivedan passport',
			resolvedQuestion: 'Nivedan passport',
			intent: 'timeline_search',
			member: {
				memberId: null,
				memberName: null,
				familyMemberNames: ['Nivedan'],
			},
			searchHits: [],
			sources: {
				identity: { knowledge },
			},
		})

		expect(
			hits.some((hit) => hit.domain === 'identity' && hit.kind === 'entity'),
		).toBe(true)
		expect(hits.some((hit) => hit.title === 'Passport')).toBe(true)
		expect(hits.every((hit) => hit.domain === 'identity')).toBe(true)
	})

	it('does not expose full document numbers in snippets', () => {
		const knowledge = buildIdentityKnowledge({
			userId: 'user-1',
			documents: [createIdentityDocument()],
			members,
			accountOwnerMemberId: 'member-nivedan',
		})

		const hits = identityIntelligenceProvider.search({
			userId: 'user-1',
			question: 'passport',
			resolvedQuestion: 'passport',
			intent: 'timeline_search',
			member: {
				memberId: null,
				memberName: null,
				familyMemberNames: ['Nivedan'],
			},
			searchHits: [],
			sources: {
				identity: { knowledge },
			},
		})

		const serialized = JSON.stringify(hits)
		expect(serialized).not.toContain('N1234567')
	})
})
