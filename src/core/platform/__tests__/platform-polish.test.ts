import { describe, expect, it, beforeEach } from 'vitest'
import { registerModuleProviders } from '@/core/platform/bootstrap/register-module-providers'
import { clearModuleProviders } from '@/core/platform/registries/module-provider-registry'
import {
	buildFederatedLibraryView,
	buildLibraryHubView,
	buildModuleProviderQuery,
} from '@/core/platform/services/federated-library.service'
import { searchFederatedLibrarySummaries } from '@/features/documents/services/document-library.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'

describe('Life Timeline filtering', () => {
	it('excludes import events by default', async () => {
		const { buildTimelineEvents } =
			await import('@/features/timeline/engine/timeline-engine')
		await import('@/features/timeline/providers/register-timeline-providers')

		const report = {
			id: 'report-1',
			user_id: 'user-1',
			family_member_id: 'member-1',
			file_name: 'checkup.pdf',
			storage_path: 'path',
			status: 'completed',
			report_type: 'Annual Master Health Checkup',
			report_date: '2025-06-15',
			uploaded_at: '2025-06-16T10:00:00.000Z',
			processed_at: '2025-06-16T11:00:00.000Z',
			parsed_data: {
				metrics: [
					{
						canonicalId: 'ldl',
						displayName: 'LDL',
						value: '100',
						unit: 'mg/dL',
						status: 'normal',
					},
				],
				metadata: {
					laboratory: 'Thyrocare',
					reportType: 'Annual Master Health Checkup',
				},
			},
		} as UploadedHealthReport

		const result = buildTimelineEvents({
			userId: 'user-1',
			sources: {
				health: { uploadedReports: [report] },
			},
		})

		expect(
			result.events.some((event) => event.eventType === 'report_imported'),
		).toBe(false)
		expect(
			result.events.some((event) => event.title.includes('Health Checkup')),
		).toBe(true)
	})
})

describe('Federated Library', () => {
	beforeEach(() => {
		clearModuleProviders()
		registerModuleProviders()
	})

	it('aggregates health and library documents without duplicate providers', () => {
		const report = {
			id: 'report-h1',
			user_id: 'user-1',
			family_member_id: 'member-1',
			file_name: 'lab.pdf',
			storage_path: 'path',
			status: 'completed',
			report_type: 'Lab',
			report_date: '2025-01-01',
			uploaded_at: '2025-01-02T00:00:00.000Z',
			processed_at: '2025-01-02T01:00:00.000Z',
		} as UploadedHealthReport

		const passport = {
			id: 'doc-passport',
			user_id: 'user-1',
			family_member_id: 'member-1',
			category_id: 'identity',
			sub_category_id: 'passport',
			title: 'Passport',
			file_name: 'passport.pdf',
			storage_path: 'path',
			mime_type: 'application/pdf',
			status: 'active',
			source: 'upload',
			tags: [],
			knowledge_refs: [],
			audit: [],
			uploaded_at: '2025-02-01T00:00:00.000Z',
			created_at: '2025-02-01T00:00:00.000Z',
			updated_at: '2025-02-01T00:00:00.000Z',
		} as ChronicleDocument

		const view = buildFederatedLibraryView({
			userId: 'user-1',
			memberNames: { 'member-1': 'Alex' },
			sources: {
				health: { uploadedReports: [report] },
				documents: { uploadedDocuments: [passport] },
				insurance: { knowledge: null },
			},
		})

		expect(view.sections.map((section) => section.moduleId)).toEqual(
			expect.arrayContaining(['health', 'documents']),
		)
		expect(view.totalCount).toBe(2)
		expect(
			view.moduleSummaries.some((summary) => summary.moduleId === 'health'),
		).toBe(true)
	})

	it('buildLibraryHubView counts health reports in category cards', () => {
		const report = {
			id: 'report-h2',
			user_id: 'user-1',
			family_member_id: 'member-1',
			file_name: 'checkup.pdf',
			storage_path: 'path',
			status: 'completed',
			report_type: 'Annual Checkup',
			report_date: '2025-06-15',
			uploaded_at: '2025-06-16T10:00:00.000Z',
			processed_at: '2025-06-16T11:00:00.000Z',
		} as UploadedHealthReport

		const query = buildModuleProviderQuery({
			userId: 'user-1',
			memberNames: { 'member-1': 'Alex' },
			healthReports: [report],
			chronicleDocuments: [],
			insuranceKnowledge: null,
		})

		const { hub } = buildLibraryHubView({
			query,
			chronicleDocuments: [],
		})

		expect(hub.categoryCounts.medical).toBe(1)
		expect(hub.totalCount).toBeGreaterThanOrEqual(1)
		expect(
			hub.allDocuments.some((document) => document.id === 'report-h2'),
		).toBe(true)
	})

	it('includes in-progress health imports with Still Organizing status', () => {
		const report = {
			id: 'report-processing',
			user_id: 'user-1',
			family_member_id: 'member-1',
			file_name: 'pending-lab.pdf',
			storage_path: 'path',
			status: 'processing',
			report_type: 'Lab',
			report_date: '2025-06-15',
			uploaded_at: '2025-06-16T10:00:00.000Z',
			processed_at: null,
		} as UploadedHealthReport

		const query = buildModuleProviderQuery({
			userId: 'user-1',
			memberNames: { 'member-1': 'Alex' },
			healthReports: [report],
			chronicleDocuments: [],
			insuranceKnowledge: null,
		})

		const { hub } = buildLibraryHubView({
			query,
			chronicleDocuments: [],
		})

		expect(hub.categoryCounts.medical).toBe(1)
		expect(hub.allDocuments[0]?.consumerStatus).toBe('Still Organizing')
	})

	it('member-filtered query excludes other members chronicle docs', () => {
		const report = {
			id: 'report-member',
			user_id: 'user-1',
			family_member_id: 'member-1',
			file_name: 'lab.pdf',
			storage_path: 'path',
			status: 'completed',
			report_type: 'Lab',
			report_date: '2025-01-01',
			uploaded_at: '2025-01-02T00:00:00.000Z',
			processed_at: '2025-01-02T01:00:00.000Z',
		} as UploadedHealthReport

		const otherMemberDoc = {
			id: 'doc-other-member',
			user_id: 'user-1',
			family_member_id: 'member-2',
			category_id: 'identity',
			sub_category_id: 'passport',
			title: 'Passport',
			file_name: 'passport.pdf',
			storage_path: 'path',
			mime_type: 'application/pdf',
			status: 'active',
			source: 'upload',
			tags: [],
			knowledge_refs: [],
			audit: [],
			uploaded_at: '2025-02-01T00:00:00.000Z',
			created_at: '2025-02-01T00:00:00.000Z',
			updated_at: '2025-02-01T00:00:00.000Z',
		} as ChronicleDocument

		const query = buildModuleProviderQuery({
			userId: 'user-1',
			memberId: 'member-1',
			memberNames: {
				'member-1': 'Alex',
				'member-2': 'Sam',
			},
			healthReports: [report],
			chronicleDocuments: [otherMemberDoc],
			insuranceKnowledge: null,
		})

		const view = buildFederatedLibraryView(query)

		expect(view.allDocuments.some((doc) => doc.id === 'report-member')).toBe(
			true,
		)
		expect(view.allDocuments.some((doc) => doc.id === 'doc-other-member')).toBe(
			false,
		)
	})

	it('searchFederatedLibrarySummaries finds health report titles', () => {
		const summaries = searchFederatedLibrarySummaries(
			[
				{
					id: 'report-search',
					title: 'Jan 2026 Full Body Checkup',
					categoryId: 'medical',
					categoryLabel: 'Health',
					subCategoryLabel: 'general',
					ownerLabel: 'Alex',
					sourceLabel: 'Google Drive',
					summary: 'Lab report',
					displayDate: 'Jan 15, 2026',
					expiresLabel: null,
					isExpiringSoon: false,
					isExpired: false,
					fileType: 'PDF',
					hasAiSummary: true,
					tags: ['health'],
					relatedModules: [],
					consumerStatus: 'Ready',
					aiDiscoveryLabel: null,
					year: 2026,
				},
			],
			'checkup',
		)

		expect(summaries).toHaveLength(1)
		expect(summaries[0]?.id).toBe('report-search')
	})
})

describe('Insurance folder discovery', () => {
	it('discovers categories from subfolder names', async () => {
		const { discoverInsuranceCategoriesFromFolderNames } =
			await import('@/features/insurance/services/insurance-folder-discovery.service')

		const categories = discoverInsuranceCategoriesFromFolderNames([
			'Health',
			'Vehicle',
			'Home',
			'Life',
		])

		expect(categories.map((category) => category.id)).toEqual(
			expect.arrayContaining(['health', 'motor', 'home', 'life_term']),
		)
	})
})
