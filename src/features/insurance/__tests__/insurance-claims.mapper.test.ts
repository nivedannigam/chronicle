import { describe, expect, it } from 'vitest'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import {
	buildClaimCards,
	buildClaimDetailViewModel,
	buildClaimsDashboardViewModel,
	deriveClaimConsumerStatus,
	filterClaimCards,
	scoreClaimSearchRelevance,
} from '@/features/insurance/services/insurance-claims.mapper'

const provider = new InsuranceKnowledgeProvider({
	fetchRawData: async () => ({}) as InsuranceKnowledgeRawData,
})

function sampleKnowledge() {
	return provider.buildFromRawData(
		{
			policies: [
				{
					id: 'policy-health',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'H-001',
					policyType: 'health',
					productName: 'Optima Restore',
					insurerId: 'insurer-1',
					status: 'active',
					inceptionDate: '2024-01-01',
					expiryDate: '2027-03-31',
					renewalDate: '2027-03-01',
					sumInsured: 2500000,
					currency: 'INR',
					sourceDocumentIds: ['doc-1'],
					extractionMethod: 'llm',
					confidence: 0.9,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
				{
					id: 'policy-motor',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'M-001',
					policyType: 'motor',
					productName: 'Mahindra XEV 9E',
					insurerId: 'insurer-1',
					status: 'active',
					inceptionDate: '2025-07-01',
					expiryDate: '2027-07-01',
					renewalDate: '2027-06-01',
					sumInsured: 1800000,
					currency: 'INR',
					sourceDocumentIds: ['doc-2'],
					extractionMethod: 'llm',
					confidence: 0.9,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
			],
			coverages: [],
			members: [
				{
					id: 'mem-1',
					policyId: 'policy-health',
					name: 'Advika',
					relationship: 'child',
					dateOfBirth: null,
					familyMemberId: null,
				},
			],
			nominees: [],
			premiums: [],
			renewals: [],
			claims: [
				{
					id: 'claim-health',
					policyId: 'policy-health',
					claimNumber: 'CLM-H-001',
					claimType: 'cashless',
					filedDate: '2025-11-15',
					settledDate: '2025-12-01',
					claimedAmount: 180000,
					approvedAmount: 175000,
					status: 'paid',
					providerName: 'Apollo Hospital',
				},
				{
					id: 'claim-motor',
					policyId: 'policy-motor',
					claimNumber: 'CLM-M-001',
					claimType: 'accident',
					filedDate: '2026-01-10',
					settledDate: null,
					claimedAmount: 68000,
					approvedAmount: null,
					status: 'processing',
					providerName: null,
				},
			],
			benefits: [],
			exclusions: [],
			documents: [
				{
					id: 'doc-settlement',
					userId: 'user-1',
					familyMemberId: 'member-1',
					fileName: 'Apollo_Settlement_Letter.pdf',
					storagePath: 'insurance/claims/Apollo_Settlement_Letter.pdf',
					documentKind: 'eob',
					status: 'completed',
					linkedPolicyIds: ['policy-health'],
					parsedData: null,
					uploadedAt: '2025-12-01T00:00:00.000Z',
					processedAt: '2025-12-01T01:00:00.000Z',
				},
			],
			insurers: [
				{
					id: 'insurer-1',
					canonicalName: 'ICICI LOMBARD',
					displayName: 'ICICI Lombard',
					country: 'IN',
				},
			],
			familyMembers: [],
			importRegistry: [],
		},
		{ userId: 'user-1', familyMemberId: 'member-1' },
	)
}

describe('insurance-claims.mapper', () => {
	it('maps claim status to consumer language', () => {
		expect(
			deriveClaimConsumerStatus({
				id: 'c1',
				policyId: 'p1',
				claimNumber: 'X',
				claimType: null,
				filedDate: null,
				settledDate: null,
				claimedAmount: null,
				approvedAmount: null,
				status: 'processing',
				providerName: null,
				priority: 'medium',
			}),
		).toBe('Under Review')

		expect(
			deriveClaimConsumerStatus({
				id: 'c2',
				policyId: 'p1',
				claimNumber: 'X',
				claimType: null,
				filedDate: null,
				settledDate: null,
				claimedAmount: 100,
				approvedAmount: 80,
				status: 'approved',
				providerName: null,
				priority: 'medium',
			}),
		).toBe('Partially Approved')
	})

	it('builds claim cards with consumer-friendly titles', () => {
		const cards = buildClaimCards(sampleKnowledge())
		const health = cards.find((card) => card.id === 'claim-health')
		const motor = cards.find((card) => card.id === 'claim-motor')

		expect(health?.title).toBe('Advika Hospitalization')
		expect(health?.status).toBe('Settled')
		expect(health?.claimedAmountLabel).toContain('Claimed')
		expect(motor?.title).toBe('Mahindra XEV 9E Accident')
		expect(motor?.approvedAmountLabel).toBe('Pending assessment')
	})

	it('builds dashboard summary stats', () => {
		const dashboard = buildClaimsDashboardViewModel(sampleKnowledge())

		expect(dashboard.claimCards).toHaveLength(2)
		expect(dashboard.summary.find((item) => item.id === 'total')?.value).toBe(
			'2',
		)
		expect(dashboard.summary.find((item) => item.id === 'pending')?.value).toBe(
			'1',
		)
	})

	it('scores natural language search for member and category', () => {
		const cards = buildClaimCards(sampleKnowledge())
		const health = cards.find((card) => card.id === 'claim-health')!

		expect(
			scoreClaimSearchRelevance(health, 'claims for advika'),
		).toBeGreaterThan(0)
		expect(scoreClaimSearchRelevance(health, 'vehicle claims')).toBe(0)
	})

	it('filters pending claims', () => {
		const knowledge = sampleKnowledge()
		const cards = buildClaimCards(knowledge)

		const pending = filterClaimCards({
			cards,
			knowledge,
			query: '',
			categoryFilters: [],
			statusFilters: ['pending'],
			timeFilters: [],
		})

		expect(pending).toHaveLength(1)
		expect(pending[0]?.id).toBe('claim-motor')
	})

	it('builds claim detail with timeline and documents', () => {
		const detail = buildClaimDetailViewModel(sampleKnowledge(), 'claim-health')

		expect(detail).not.toBeNull()
		expect(detail?.timeline.length).toBeGreaterThan(0)
		expect(detail?.documents).toHaveLength(1)
		expect(detail?.aiSummary.length).toBeGreaterThan(0)
		expect(detail?.payments).toHaveLength(1)
	})
})
