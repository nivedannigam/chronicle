import { describe, expect, it } from 'vitest'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import {
	buildPoliciesListViewModel,
	buildPolicyCards,
	buildPolicyDetailViewModel,
	filterPolicyCards,
	groupPolicyCards,
	maskPolicyNumber,
	scorePolicySearchRelevance,
} from '@/features/insurance/services/insurance-policies.mapper'

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
					policyNumber: 'H-12345001',
					policyType: 'health',
					productName: 'Optima Restore',
					insurerId: 'insurer-2',
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
					id: 'policy-motor-1',
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
					sourceDocumentIds: ['doc-3'],
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
					name: 'Nivedan',
					relationship: 'self',
					dateOfBirth: null,
					familyMemberId: 'member-1',
				},
				{
					id: 'mem-2',
					policyId: 'policy-health',
					name: 'Advika',
					relationship: 'child',
					dateOfBirth: null,
					familyMemberId: null,
				},
			],
			nominees: [],
			premiums: [
				{
					id: 'prem-1',
					policyId: 'policy-health',
					amount: 42000,
					currency: 'INR',
					frequency: 'annual',
					dueDate: '2027-03-01',
					paidDate: '2026-03-01',
				},
			],
			renewals: [],
			claims: [],
			benefits: [],
			exclusions: [],
			documents: [
				{
					id: 'doc-1',
					userId: 'user-1',
					familyMemberId: 'member-1',
					fileName: 'ICICI Health Policy.pdf',
					storagePath: 'insurance/health/ICICI Health Policy.pdf',
					documentKind: 'policy_schedule',
					status: 'completed',
					linkedPolicyIds: ['policy-health'],
					uploadedAt: '2026-01-01T00:00:00.000Z',
					processedAt: '2026-01-01T01:00:00.000Z',
					parsedData: null,
				},
			],
			insurers: [
				{
					id: 'insurer-1',
					canonicalName: 'HDFC ERGO',
					displayName: 'HDFC Ergo',
					country: 'IN',
				},
				{
					id: 'insurer-2',
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

describe('insurance-policies.mapper', () => {
	it('masks policy numbers for display', () => {
		expect(maskPolicyNumber('H-12345001')).toBe('•••• 5001')
		expect(maskPolicyNumber('AB')).toBe('•••• AB')
	})

	it('builds policy cards with consumer-friendly labels', () => {
		const knowledge = sampleKnowledge()
		const cards = buildPolicyCards(knowledge)
		const health = cards.find((card) => card.id === 'policy-health')
		const motor = cards.find((card) => card.id === 'policy-motor-1')

		expect(health?.name).toContain('ICICI Lombard')
		expect(health?.coverageLabel).toContain('₹')
		expect(health?.coveredMembers).toEqual(['Nivedan', 'Advika'])
		expect(health?.premiumLabel).toContain('42,000')
		expect(motor?.name).toBe('Mahindra Vehicle Insurance')
		expect(motor?.assetLabel).toBe('Mahindra XEV 9E')
	})

	it('builds list view model with count', () => {
		const list = buildPoliciesListViewModel(sampleKnowledge())

		expect(list.policyCards).toHaveLength(2)
		expect(list.subtitle).toContain('2 policies')
	})

	it('scores natural language search for insurer and member', () => {
		const knowledge = sampleKnowledge()
		const cards = buildPolicyCards(knowledge)
		const health = cards.find((card) => card.id === 'policy-health')!

		expect(
			scorePolicySearchRelevance(health, knowledge, 'show my icici policies'),
		).toBeGreaterThan(0)
		expect(
			scorePolicySearchRelevance(health, knowledge, 'policies covering advika'),
		).toBeGreaterThan(0)
		expect(
			scorePolicySearchRelevance(health, knowledge, 'show vehicle insurance'),
		).toBe(0)
	})

	it('filters by category and status', () => {
		const knowledge = sampleKnowledge()
		const cards = buildPolicyCards(knowledge)

		const healthOnly = filterPolicyCards({
			cards,
			knowledge,
			query: '',
			categoryFilters: ['health'],
			statusFilters: [],
		})

		expect(healthOnly).toHaveLength(1)
		expect(healthOnly[0]?.id).toBe('policy-health')
	})

	it('groups policies by category', () => {
		const cards = buildPolicyCards(sampleKnowledge())
		const groups = groupPolicyCards(cards, 'category')

		expect(groups.some((group) => group.id === 'health')).toBe(true)
		expect(groups.some((group) => group.id === 'motor')).toBe(true)
	})

	it('builds policy detail with summary and documents', () => {
		const detail = buildPolicyDetailViewModel(
			sampleKnowledge(),
			'policy-health',
		)

		expect(detail).not.toBeNull()
		expect(detail?.name).toContain('ICICI Lombard')
		expect(detail?.documents).toHaveLength(1)
		expect(detail?.documents[0]?.kindLabel).toBe('Original policy')
		expect(detail?.aiSummary.length).toBeGreaterThan(0)
		expect(detail?.askPrompt).toContain('ICICI Lombard')
	})
})
