import { describe, expect, it } from 'vitest'
import { buildIdentityKnowledge } from '@/features/identity-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { planAndResolveIdentityEvidence } from '@/shared/ai/evidence-planning/plan-identity-evidence'

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
		issue_date: overrides.issue_date ?? '2020-01-01',
		expiry_date: overrides.expiry_date ?? '2030-06-30',
		issuer: overrides.issuer ?? 'India',
		document_number: overrides.document_number ?? 'N1234567',
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
	{
		id: 'member-advika',
		userId: 'user-1',
		familyId: null,
		displayName: 'Advika',
		relationship: 'daughter',
		isAccountOwner: false,
		roleId: 'child' as const,
		dateOfBirth: null,
		gender: null,
		status: 'active' as const,
		avatarUrl: null,
		sortOrder: 1,
		aliases: [],
		createdAt: '',
		updatedAt: '',
	},
]

function buildKnowledge(documents: ChronicleDocument[]) {
	return buildIdentityKnowledge({
		userId: 'user-1',
		documents,
		members,
		accountOwnerMemberId: 'member-nivedan',
	})
}

describe('planAndResolveIdentityEvidence', () => {
	it('answers passport expiry with masked identifier only', () => {
		const knowledge = buildKnowledge([createIdentityDocument()])
		const resolved = planAndResolveIdentityEvidence({
			question: 'What is my passport expiry date?',
			knowledge,
		})

		expect(resolved.evidenceBundle.summary.lines.join(' ')).toContain(
			'2030-06-30',
		)
		expect(resolved.evidenceBundle.summary.lines.join(' ')).not.toContain(
			'N1234567',
		)
		expect(resolved.evidenceBundle.summary.lines.join(' ')).toMatch(
			/ending in|4567/,
		)
	})

	it('lists identity documents for inventory questions', () => {
		const knowledge = buildKnowledge([
			createIdentityDocument(),
			createIdentityDocument({
				id: 'doc-advika-passport',
				family_member_id: 'member-advika',
				title: 'Advika Passport',
				expiry_date: '2029-12-01',
			}),
		])

		const resolved = planAndResolveIdentityEvidence({
			question: 'What identity documents do I have?',
			knowledge,
		})

		expect(resolved.questionType).toBe('ENTITY_LOOKUP')
		expect(resolved.evidenceBundle.summary.lines.length).toBeGreaterThan(0)
	})

	it('reports missing coverage without fabricating documents', () => {
		const knowledge = buildKnowledge([
			createIdentityDocument({
				sub_category_id: 'passport',
			}),
		])

		const resolved = planAndResolveIdentityEvidence({
			question: 'Which documents are missing?',
			knowledge,
		})

		expect(resolved.questionType).toBe('COVERAGE')
		expect(
			resolved.evidenceBundle.summary.lines.some((line) =>
				/missing/i.test(line),
			),
		).toBe(true)
	})
})
