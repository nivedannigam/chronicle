import { describe, expect, it } from 'vitest'
import {
	buildAiDiscoveryLabel,
	resolveConsumerDocumentStatus,
	resolveDocumentModuleLinks,
} from '@/features/documents/services/document-module-links.service'
import { searchDocumentsNaturalLanguage } from '@/features/documents/services/document-library.service'
import { buildDocumentsHubView } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

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
		extracted_text: 'Passport Number N1234567',
		extracted_metadata: {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: '2026-01-10T10:00:00.000Z',
		created_at: '2026-01-10T10:00:00.000Z',
		updated_at: '2026-01-10T10:00:00.000Z',
		...overrides,
	}
}

describe('resolveDocumentModuleLinks', () => {
	it('links health reports to Health module', () => {
		const links = resolveDocumentModuleLinks(
			createDocument({
				category_id: 'medical',
				sub_category_id: 'discharge-summary',
				title: 'Full Body Checkup',
			}),
		)

		expect(links.some((link) => link.label === 'Health')).toBe(true)
	})

	it('links vehicle insurance to Insurance and Vehicles', () => {
		const links = resolveDocumentModuleLinks(
			createDocument({
				category_id: 'insurance',
				sub_category_id: 'vehicle-insurance',
				title: 'Mahindra XEV Insurance',
			}),
		)

		expect(links.map((link) => link.label)).toEqual(
			expect.arrayContaining(['Insurance', 'Vehicles']),
		)
	})

	it('uses knowledge refs when present', () => {
		const links = resolveDocumentModuleLinks(
			createDocument({
				knowledge_refs: [
					{ domain: 'insurance', entityId: 'policy-1', label: 'Insurance' },
				],
			}),
		)

		expect(links[0]?.label).toBe('Insurance')
	})
})

describe('buildAiDiscoveryLabel', () => {
	it('describes passport documents conversationally', () => {
		expect(buildAiDiscoveryLabel(createDocument())).toBe(
			'This appears to be a Passport.',
		)
	})
})

describe('resolveConsumerDocumentStatus', () => {
	it('marks processing documents as still organizing', () => {
		expect(
			resolveConsumerDocumentStatus(createDocument({ status: 'processing' })),
		).toBe('Still Organizing')
	})

	it('marks failed documents as needs help', () => {
		expect(
			resolveConsumerDocumentStatus(createDocument({ status: 'failed' })),
		).toBe('Needs Help')
	})
})

describe('searchDocumentsNaturalLanguage', () => {
	it('finds passport via natural language query', () => {
		const documents = [
			createDocument(),
			createDocument({
				id: 'doc-2',
				title: 'Salary Slip March 2026',
				category_id: 'employment',
				sub_category_id: 'salary-slip',
				file_name: 'salary.pdf',
			}),
		]

		const results = searchDocumentsNaturalLanguage(
			documents,
			'Show my passport',
			{ 'member-1': 'Nivedan' },
		)

		expect(results[0]?.title).toContain('Passport')
	})

	it('finds vehicle documents via brand query', () => {
		const results = searchDocumentsNaturalLanguage(
			[
				createDocument({
					id: 'doc-3',
					title: 'Mahindra XEV Policy',
					category_id: 'vehicles',
					sub_category_id: 'vehicle-insurance',
					file_name: 'mahindra_policy.pdf',
				}),
			],
			'Mahindra',
			{},
		)

		expect(results).toHaveLength(1)
	})
})

describe('buildDocumentsHubView', () => {
	it('includes ai discoveries and needs attention sections', () => {
		const hub = buildDocumentsHubView({
			documents: [
				createDocument(),
				createDocument({
					id: 'doc-4',
					status: 'failed',
					title: 'Unreadable Scan',
				}),
			],
			memberNames: { 'member-1': 'Nivedan' },
		})

		expect(hub.aiDiscoveries.length).toBeGreaterThan(0)
		expect(hub.needsAttention.length).toBeGreaterThan(0)
		expect(hub.totalCount).toBe(2)
	})
})
