import { describe, expect, it } from 'vitest'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import { buildInsuranceHomeViewModel } from '@/features/insurance/services/insurance-home.mapper'

const provider = new InsuranceKnowledgeProvider({
	fetchRawData: async () => ({}) as InsuranceKnowledgeRawData,
})

describe('buildInsuranceHomeViewModel', () => {
	it('maps knowledge into consumer home sections', () => {
		const knowledge = provider.buildFromRawData(
			{
				policies: [
					{
						id: 'policy-1',
						userId: 'user-1',
						familyMemberId: 'member-1',
						policyNumber: 'POL-001',
						policyType: 'health',
						productName: 'Optima Restore',
						insurerId: 'insurer-1',
						status: 'active',
						inceptionDate: '2024-01-01',
						expiryDate: '2027-01-01',
						renewalDate: '2026-12-01',
						sumInsured: 500000,
						currency: 'INR',
						sourceDocumentIds: ['doc-1'],
						extractionMethod: 'llm',
						confidence: 0.9,
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
				],
				coverages: [
					{
						id: 'cov-1',
						policyId: 'policy-1',
						canonicalCoverageId: 'hospitalization',
						displayName: 'Hospitalization',
						sumInsured: 500000,
						sublimit: null,
						deductible: null,
						copay: null,
						waitingPeriodDays: null,
						status: 'active',
					},
				],
				members: [
					{
						id: 'mem-1',
						policyId: 'policy-1',
						name: 'Nivedan',
						relationship: 'self',
						dateOfBirth: null,
						familyMemberId: 'member-1',
					},
				],
				nominees: [],
				premiums: [],
				renewals: [],
				claims: [],
				benefits: [],
				exclusions: [],
				documents: [
					{
						id: 'doc-1',
						userId: 'user-1',
						familyMemberId: 'member-1',
						fileName: 'policy.pdf',
						storagePath: 'insurance/policy.pdf',
						documentKind: 'policy_schedule',
						status: 'completed',
						linkedPolicyIds: ['policy-1'],
						parsedData: null,
						uploadedAt: '2026-01-01T00:00:00.000Z',
						processedAt: '2026-01-01T01:00:00.000Z',
					},
				],
				insurers: [
					{
						id: 'insurer-1',
						canonicalName: 'HDFC ERGO',
						displayName: 'HDFC Ergo',
						country: 'IN',
					},
				],
				familyMembers: [],
				importRegistry: [],
			},
			{ userId: 'user-1', familyMemberId: 'member-1' },
		)

		const home = buildInsuranceHomeViewModel({
			knowledge,
			memberName: 'Nivedan',
		})

		expect(home.hasPolicies).toBe(true)
		expect(home.protection.score).not.toBeNull()
		expect(home.summary.length).toBeGreaterThan(0)
		expect(home.coverageCards).toHaveLength(5)
		expect(home.coverageCards[0]?.status).toBe('Protected')
		expect(home.greeting).toContain('Nivedan')
	})

	it('returns empty-state friendly model without policies', () => {
		const knowledge = provider.buildFromRawData(
			{
				policies: [],
				coverages: [],
				members: [],
				nominees: [],
				premiums: [],
				renewals: [],
				claims: [],
				benefits: [],
				exclusions: [],
				documents: [],
				insurers: [],
				familyMembers: [],
				importRegistry: [],
			},
			{ userId: 'user-1' },
		)

		const home = buildInsuranceHomeViewModel({
			knowledge,
			memberName: null,
		})

		expect(home.hasPolicies).toBe(false)
		expect(home.protection.protectionStatus).toBe('Getting Started')
	})
})
