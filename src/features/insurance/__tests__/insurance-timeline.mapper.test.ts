import { describe, expect, it } from 'vitest'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import {
	buildInsuranceTimelineViewModel,
	buildTimelineCards,
	filterTimelineCards,
} from '@/features/insurance/services/insurance-timeline.mapper'

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
					inceptionDate: '2026-03-01',
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
					inceptionDate: '2026-07-01',
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
			renewals: [
				{
					id: 'renewal-1',
					policyId: 'policy-health',
					renewalDate: '2026-03-15',
					previousPremium: 18000,
					newPremium: 42000,
					status: 'paid',
					sourceDocumentId: null,
				},
			],
			claims: [
				{
					id: 'claim-health',
					policyId: 'policy-health',
					claimNumber: 'CLM-001',
					claimType: 'cashless',
					filedDate: '2026-10-05',
					settledDate: '2026-10-20',
					claimedAmount: 180000,
					approvedAmount: 175000,
					status: 'paid',
					providerName: 'Apollo Hospital',
				},
			],
			benefits: [
				{
					id: 'benefit-1',
					policyId: 'policy-motor',
					description: 'Cashless Garage',
				},
				{
					id: 'benefit-2',
					policyId: 'policy-motor',
					description: 'Roadside Assistance',
				},
			],
			exclusions: [],
			documents: [],
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

describe('insurance-timeline.mapper', () => {
	it('excludes internal document and premium events', () => {
		const knowledge = sampleKnowledge()
		const cards = buildTimelineCards(knowledge)

		expect(
			knowledge.timeline.some((event) => event.type === 'document_imported'),
		).toBe(false)
		expect(
			cards.every((card) => !card.title.toLowerCase().includes('imported')),
		).toBe(true)
	})

	it('builds consumer-friendly timeline cards', () => {
		const cards = buildTimelineCards(sampleKnowledge())
		const motor = cards.find((card) => card.kind === 'vehicle_purchased')
		const claim = cards.find((card) => card.kind === 'claim_settled')

		expect(motor?.title).toContain('Mahindra XEV 9E')
		expect(motor?.highlights).toContain('Cashless Garage')
		expect(claim?.memberName).toBe('Advika')
	})

	it('builds year groups with summary and story', () => {
		const timeline = buildInsuranceTimelineViewModel(sampleKnowledge())

		expect(timeline.yearGroups.length).toBeGreaterThan(0)
		expect(timeline.yearGroups[0]?.story.length).toBeGreaterThan(0)
		expect(timeline.yearGroups[0]?.summary.policiesAdded).toBeGreaterThan(0)
	})

	it('detects milestones', () => {
		const timeline = buildInsuranceTimelineViewModel(sampleKnowledge())

		expect(
			timeline.milestones.some((milestone) =>
				milestone.label.includes('Health Insurance'),
			),
		).toBe(true)
	})

	it('filters renewals from search', () => {
		const knowledge = sampleKnowledge()
		const cards = buildTimelineCards(knowledge)

		const renewals = filterTimelineCards({
			cards,
			query: 'show my renewals',
			categoryFilters: ['renewals'],
		})

		expect(renewals.every((card) => card.filterTags.includes('renewals'))).toBe(
			true,
		)
	})
})
