import { describe, expect, it } from 'vitest'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import {
	buildProtectionAreaCard,
	buildProtectionDetailViewModel,
	buildProtectionOverviewViewModel,
} from '@/features/insurance/services/insurance-protection.mapper'

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
					id: 'policy-health-2',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'H-002',
					policyType: 'health',
					productName: 'Super Top Up',
					insurerId: 'insurer-2',
					status: 'active',
					inceptionDate: '2024-06-01',
					expiryDate: '2027-06-01',
					renewalDate: '2027-05-01',
					sumInsured: 1000000,
					currency: 'INR',
					sourceDocumentIds: ['doc-2'],
					extractionMethod: 'llm',
					confidence: 0.88,
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
				{
					id: 'policy-motor-2',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'M-002',
					policyType: 'motor',
					productName: 'Honda City',
					insurerId: 'insurer-1',
					status: 'active',
					inceptionDate: '2025-07-01',
					expiryDate: '2027-07-01',
					renewalDate: '2027-06-01',
					sumInsured: 900000,
					currency: 'INR',
					sourceDocumentIds: ['doc-4'],
					extractionMethod: 'llm',
					confidence: 0.9,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
				{
					id: 'policy-life',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'L-001',
					policyType: 'life_term',
					productName: 'iProtect Smart',
					insurerId: 'insurer-3',
					status: 'active',
					inceptionDate: '2020-01-01',
					expiryDate: '2045-01-01',
					renewalDate: null,
					sumInsured: 30000000,
					currency: 'INR',
					sourceDocumentIds: ['doc-5'],
					extractionMethod: 'llm',
					confidence: 0.95,
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
					name: 'Wife',
					relationship: 'spouse',
					dateOfBirth: null,
					familyMemberId: null,
				},
				{
					id: 'mem-3',
					policyId: 'policy-health',
					name: 'Advika',
					relationship: 'child',
					dateOfBirth: null,
					familyMemberId: null,
				},
			],
			nominees: [
				{
					id: 'nom-1',
					policyId: 'policy-life',
					name: 'Wife',
					relationship: 'spouse',
					sharePercent: 100,
				},
			],
			premiums: [],
			renewals: [],
			claims: [],
			benefits: [
				{
					id: 'ben-1',
					policyId: 'policy-health',
					description: 'AYUSH treatment covered',
				},
			],
			exclusions: [
				{
					id: 'exc-1',
					policyId: 'policy-health',
					description: 'Cosmetic surgery excluded',
				},
			],
			documents: [],
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
				{
					id: 'insurer-3',
					canonicalName: 'HDFC LIFE',
					displayName: 'HDFC Life',
					country: 'IN',
				},
			],
			familyMembers: [],
			importRegistry: [],
		},
		{ userId: 'user-1', familyMemberId: 'member-1' },
	)
}

describe('insurance-protection.mapper', () => {
	it('aggregates multiple health policies into one area card', () => {
		const knowledge = sampleKnowledge()
		const health = buildProtectionAreaCard(knowledge, 'health')

		expect(health.status).toMatch(/Excellent|Protected/)
		expect(health.coverageLabel).toContain('₹')
		expect(health.coverageSubLabel).toContain('2 policies combined')
		expect(health.coveredMembers).toEqual(['Nivedan', 'Wife', 'Advika'])
		expect(health.insurerLabel).toContain('HDFC Ergo')
	})

	it('aggregates multiple motor policies as vehicle count', () => {
		const knowledge = sampleKnowledge()
		const motor = buildProtectionAreaCard(knowledge, 'motor')

		expect(motor.coverageLabel).toBe('2 Vehicles')
		expect(motor.assetLabels).toContain('Mahindra XEV 9E')
		expect(motor.assetLabels).toContain('Honda City')
	})

	it('shows life nominee badge and crore cover', () => {
		const knowledge = sampleKnowledge()
		const life = buildProtectionAreaCard(knowledge, 'life_term')

		expect(life.coverageLabel).toContain('Cr')
		expect(life.badge).toBe('Nominee verified')
		expect(life.insurerLabel).toBe('HDFC Life')
	})

	it('builds overview with applicable areas only', () => {
		const overview = buildProtectionOverviewViewModel(sampleKnowledge())

		expect(overview.areas.some((area) => area.id === 'health')).toBe(true)
		expect(overview.areas.some((area) => area.id === 'motor')).toBe(true)
		expect(overview.areas.some((area) => area.id === 'life_term')).toBe(true)
		expect(overview.areas.some((area) => area.id === 'travel')).toBe(false)
	})

	it('builds detail with policies, benefits, and exclusions', () => {
		const detail = buildProtectionDetailViewModel({
			knowledge: sampleKnowledge(),
			categoryId: 'health',
		})

		expect(detail).not.toBeNull()
		expect(detail?.policies).toHaveLength(2)
		expect(detail?.benefits).toContain('AYUSH treatment covered')
		expect(detail?.exclusions).toContain('Cosmetic surgery excluded')
		expect(detail?.askPrompt).toContain('health')
	})
})
