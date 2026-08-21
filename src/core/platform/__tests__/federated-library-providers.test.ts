import { describe, expect, it, beforeEach } from 'vitest'
import { registerModuleProviders } from '@/core/platform/bootstrap/register-module-providers'
import { clearModuleProviders } from '@/core/platform/registries/module-provider-registry'
import {
	buildFederatedLibraryView,
	buildModuleProviderQuery,
} from '@/core/platform/services/federated-library.service'
import { dedupeLibrarySummaries } from '@/core/platform/providers/module-document-provider.utils'
import type { UploadedHealthReport } from '@/features/health/types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'

function makeHealthReport(
	overrides: Partial<UploadedHealthReport> = {},
): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: 'user-1',
		family_member_id: 'member-1',
		file_name: 'checkup.pdf',
		storage_path: 'path',
		status: 'completed',
		report_type: 'Annual Checkup',
		report_date: '2026-04-23',
		uploaded_at: '2026-04-24T00:00:00.000Z',
		processed_at: '2026-04-24T01:00:00.000Z',
		source: 'google_drive',
		...overrides,
	} as UploadedHealthReport
}

function makeInsuranceKnowledge(
	overrides: Partial<InsuranceKnowledge> = {},
): InsuranceKnowledge {
	return {
		holder: { userId: 'user-1' },
		familyMember: {
			id: 'member-1',
			displayName: 'Alex',
			relationship: 'self',
			isAccountOwner: true,
			dateOfBirth: null,
		},
		policies: [
			{
				id: 'policy-1',
				policyNumber: 'POL-123',
				policyType: 'motor',
				categoryId: 'motor',
				productName: 'Car Policy',
				insurerId: 'ins-1',
				insurerName: 'Insurer',
				status: 'active',
				inceptionDate: '2025-03-19',
				expiryDate: '2028-03-18',
				renewalDate: null,
				sumInsured: null,
				currency: 'INR',
				isDisplayReady: true,
				needsReprocess: false,
				daysUntilExpiry: 600,
				isExpiringSoon: false,
				extractionMethod: 'ai',
				confidence: 0.9,
				priority: 'medium',
				rankingReason: 'active',
				sourceDocumentIds: ['doc-1'],
			},
		],
		activePolicies: [],
		expiringPolicies: [],
		lapsedPolicies: [],
		coverages: [],
		claims: [],
		members: [],
		nominees: [],
		insurers: [],
		premiums: [],
		renewals: [],
		benefits: [],
		exclusions: [],
		documents: [
			{
				id: 'doc-1',
				fileName: 'car-policy.pdf',
				documentKind: 'policy_schedule',
				status: 'completed',
				linkedPolicyIds: ['policy-1'],
				uploadedAt: '2026-01-01T00:00:00.000Z',
				isDisplayReady: true,
			},
		],
		relationships: [],
		coverageGaps: [],
		coverageByCategory: [],
		protectionScore: null,
		timeline: [],
		insights: [],
		recommendations: [],
		confidence: {
			overall: 0.8,
			policyExtraction: 0.8,
			coverageCompleteness: 0.5,
			claimLinkage: 0.5,
		},
		limitations: [],
		sources: [],
		summary: {
			headline: '2 policies',
			subline: '',
			policyCount: 1,
			activePolicyCount: 1,
			expiringCount: 0,
			claimCount: 0,
			totalSumInsured: null,
			currency: 'INR',
		},
		generatedAt: '2026-01-01T00:00:00.000Z',
		buildDurationMs: 1,
		...overrides,
	} as InsuranceKnowledge
}

describe('Federated module document providers', () => {
	beforeEach(() => {
		clearModuleProviders()
		registerModuleProviders()
	})

	it('surfaces health reports without chronicle_documents rows', () => {
		const query = buildModuleProviderQuery({
			userId: 'user-1',
			memberNames: { 'member-1': 'Alex' },
			healthReports: [makeHealthReport()],
			chronicleDocuments: [],
			insuranceKnowledge: null,
		})

		const view = buildFederatedLibraryView(query)

		expect(view.totalCount).toBe(1)
		expect(view.allDocuments[0]?.moduleDetailLink?.path).toContain(
			'/health/reports/',
		)
		expect(view.allDocuments[0]?.sourceKey).toBe('health:report-1')
	})

	it('surfaces insurance documents and policies from knowledge', () => {
		const query = buildModuleProviderQuery({
			userId: 'user-1',
			memberNames: { 'member-1': 'Alex' },
			healthReports: [],
			chronicleDocuments: [],
			insuranceKnowledge: makeInsuranceKnowledge(),
		})

		const view = buildFederatedLibraryView(query)

		expect(view.totalCount).toBe(2)
		expect(
			view.allDocuments.some((doc) =>
				doc.moduleDetailLink?.path.includes('/insurance/policies/'),
			),
		).toBe(true)
	})

	it('filters federated documents by member scope', () => {
		const query = buildModuleProviderQuery({
			userId: 'user-1',
			memberId: 'member-1',
			memberNames: { 'member-1': 'Alex', 'member-2': 'Sam' },
			accountOwnerMemberId: 'member-1',
			healthReports: [
				makeHealthReport({ id: 'report-1', family_member_id: 'member-1' }),
				makeHealthReport({ id: 'report-2', family_member_id: 'member-2' }),
			],
			chronicleDocuments: [],
			insuranceKnowledge: null,
		})

		const view = buildFederatedLibraryView(query)

		expect(view.totalCount).toBe(1)
		expect(view.allDocuments[0]?.id).toBe('report-1')
	})

	it('dedupes rescans by stable source keys', () => {
		const duplicateSummaries = [
			{
				id: 'report-1',
				title: 'A',
				categoryId: 'medical',
				categoryLabel: 'Health',
				subCategoryLabel: null,
				ownerLabel: 'Alex',
				sourceLabel: 'Google Drive',
				summary: 'A',
				displayDate: 'Jan 1, 2026',
				expiresLabel: null,
				isExpiringSoon: false,
				isExpired: false,
				fileType: 'PDF',
				hasAiSummary: true,
				tags: [],
				relatedModules: [],
				moduleDetailLink: null,
				consumerStatus: 'Ready' as const,
				aiDiscoveryLabel: null,
				year: 2026,
				sourceKey: 'health:report-1',
			},
			{
				id: 'report-1-copy',
				title: 'A copy',
				categoryId: 'medical',
				categoryLabel: 'Health',
				subCategoryLabel: null,
				ownerLabel: 'Alex',
				sourceLabel: 'Google Drive',
				summary: 'A',
				displayDate: 'Jan 1, 2026',
				expiresLabel: null,
				isExpiringSoon: false,
				isExpired: false,
				fileType: 'PDF',
				hasAiSummary: true,
				tags: [],
				relatedModules: [],
				moduleDetailLink: null,
				consumerStatus: 'Ready' as const,
				aiDiscoveryLabel: null,
				year: 2026,
				sourceKey: 'health:report-1',
			},
		]

		expect(dedupeLibrarySummaries(duplicateSummaries)).toHaveLength(1)
	})

	it('includes identity documents from identity knowledge without duplicating into chronicle_documents', () => {
		const query = buildModuleProviderQuery({
			userId: 'user-1',
			memberNames: { 'member-1': 'Alex' },
			healthReports: [],
			chronicleDocuments: [],
			insuranceKnowledge: null,
			identityKnowledge: {
				userId: 'user-1',
				documents: [
					{
						id: 'identity-1',
						chronicleDocumentId: 'doc-passport',
						typeId: 'passport',
						typeLabel: 'Passport',
						ownerMemberId: 'member-1',
						ownerName: 'Alex',
						title: 'Passport',
						fileName: 'passport.pdf',
						documentNumber: 'N1234567',
						maskedDocumentNumber: 'N*****567',
						issueDate: '2020-01-01',
						expiryDate: '2030-01-01',
						issuer: null,
						nationality: null,
						dateOfBirth: null,
						status: 'valid_until',
						versionRole: 'current',
						consumerStatus: 'ready',
						summary: 'Passport on file',
						storagePath: 'path',
						mimeType: 'application/pdf',
						uploadedAt: '2026-01-01T00:00:00.000Z',
						folderPath: null,
						isPrimaryType: true,
					},
				],
				memberWallets: [],
				attentionItems: [],
				timelineEvents: [],
				documentCount: 1,
				hasDocuments: true,
				isOrganizing: false,
			},
		})

		const view = buildFederatedLibraryView(query)
		const passport = view.allDocuments[0]

		expect(view.totalCount).toBe(1)
		expect(passport?.privacySensitive).toBe(true)
		expect(passport?.moduleDetailLink?.path).toBe(
			'/identity/documents/doc-passport',
		)
		expect(passport?.summary).not.toContain('N1234567')
	})
})
