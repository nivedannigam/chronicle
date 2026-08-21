import { describe, expect, it } from 'vitest'
import { filterDocumentsForMember } from '@/features/documents/services/document.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { QA_MEMBER_IDS } from '@/qa/qa-constants'

function makeDoc(overrides: Partial<ChronicleDocument>): ChronicleDocument {
	return {
		id: 'doc-1',
		user_id: 'user-1',
		family_member_id: QA_MEMBER_IDS.nivedan,
		category_id: 'identity',
		sub_category_id: 'passport',
		title: 'Passport',
		file_name: 'passport.pdf',
		storage_path: 'path',
		mime_type: 'application/pdf',
		issue_date: null,
		expiry_date: null,
		issuer: null,
		document_number: null,
		tags: [],
		notes: null,
		status: 'active',
		source: 'upload',
		connector_id: null,
		external_file_id: null,
		connector_registry_id: null,
		extracted_text: null,
		extracted_metadata: {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: '2026-01-01T00:00:00.000Z',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		...overrides,
	}
}

describe('filterDocumentsForMember', () => {
	it('hides another member private document', () => {
		const filtered = filterDocumentsForMember(
			[
				makeDoc({ id: 'nivedan', family_member_id: QA_MEMBER_IDS.nivedan }),
				makeDoc({ id: 'priya', family_member_id: QA_MEMBER_IDS.wife }),
			],
			QA_MEMBER_IDS.nivedan,
			QA_MEMBER_IDS.nivedan,
		)

		expect(filtered.map((doc) => doc.id)).toEqual(['nivedan'])
	})

	it('includes shared documents for every member view', () => {
		const filtered = filterDocumentsForMember(
			[
				makeDoc({
					id: 'shared',
					family_member_id: null,
					extracted_metadata: { privacyScope: 'shared' },
				}),
			],
			QA_MEMBER_IDS.daughter,
			QA_MEMBER_IDS.nivedan,
		)

		expect(filtered.map((doc) => doc.id)).toEqual(['shared'])
	})
})
