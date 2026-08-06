import { describe, expect, it } from 'vitest'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import {
	buildInsuranceAskTurn,
	classifyInsuranceAskIntent,
} from '@/features/insurance/services/insurance-ask.engine'

const provider = new InsuranceKnowledgeProvider({
	fetchRawData: async () => ({}) as InsuranceKnowledgeRawData,
})

function buildKnowledge(overrides: Partial<InsuranceKnowledgeRawData> = {}) {
	return provider.buildFromRawData(
		{
			policies: [
				{
					id: 'policy-health',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'POL-H-001',
					policyType: 'health',
					productName: 'ICICI Health Shield',
					insurerId: 'insurer-icici',
					status: 'active',
					inceptionDate: '2024-01-01',
					expiryDate: '2027-01-01',
					renewalDate: '2026-12-01',
					sumInsured: 2500000,
					currency: 'INR',
					sourceDocumentIds: ['doc-1'],
					extractionMethod: 'llm',
					confidence: 0.9,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
				{
					id: 'policy-life',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'POL-L-001',
					policyType: 'life_term',
					productName: 'HDFC Term Plan',
					insurerId: 'insurer-hdfc',
					status: 'active',
					inceptionDate: '2023-01-01',
					expiryDate: '2043-01-01',
					renewalDate: null,
					sumInsured: 30000000,
					currency: 'INR',
					sourceDocumentIds: ['doc-2'],
					extractionMethod: 'llm',
					confidence: 0.9,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
				{
					id: 'policy-motor',
					userId: 'user-1',
					familyMemberId: 'member-1',
					policyNumber: 'POL-M-001',
					policyType: 'motor',
					productName: 'Mahindra XEV 9E',
					insurerId: 'insurer-icici',
					status: 'active',
					inceptionDate: '2025-07-01',
					expiryDate: '2027-07-01',
					renewalDate: '2027-07-01',
					sumInsured: 1500000,
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
					name: 'Advika',
					relationship: 'child',
					dateOfBirth: null,
					familyMemberId: 'member-2',
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
					dueDate: '2026-12-01',
					paidDate: '2025-12-01',
					sourceDocumentId: 'doc-1',
				},
				{
					id: 'prem-2',
					policyId: 'policy-life',
					amount: 28000,
					currency: 'INR',
					frequency: 'annual',
					dueDate: '2026-01-01',
					paidDate: '2026-01-01',
					sourceDocumentId: 'doc-2',
				},
			],
			renewals: [],
			claims: [
				{
					id: 'claim-1',
					policyId: 'policy-health',
					claimNumber: 'CLM-001',
					claimType: 'reimbursement',
					filedDate: '2025-06-01',
					settledDate: '2025-07-01',
					claimedAmount: 45000,
					approvedAmount: 42000,
					status: 'paid',
					providerName: 'City Hospital',
				},
			],
			benefits: [],
			exclusions: [],
			documents: [],
			insurers: [
				{
					id: 'insurer-icici',
					canonicalName: 'ICICI Lombard',
					displayName: 'ICICI Lombard',
					country: 'IN',
				},
				{
					id: 'insurer-hdfc',
					canonicalName: 'HDFC Life',
					displayName: 'HDFC Life',
					country: 'IN',
				},
			],
			familyMembers: [
				{
					id: 'member-1',
					userId: 'user-1',
					familyId: 'family-1',
					displayName: 'Nivedan',
					relationship: 'self',
					isAccountOwner: true,
					roleId: 'owner',
					dateOfBirth: '1990-01-01',
					gender: 'male',
					status: 'active',
					avatarUrl: null,
					sortOrder: 0,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
					aliases: [],
				},
			],
			importRegistry: [],
			...overrides,
		},
		{
			userId: 'user-1',
			familyMemberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		},
	)
}

describe('classifyInsuranceAskIntent', () => {
	it('detects protection overview questions', () => {
		expect(classifyInsuranceAskIntent('Am I adequately insured?')).toBe(
			'protection_overview',
		)
	})

	it('detects premium questions', () => {
		expect(
			classifyInsuranceAskIntent('How much premium do I pay every year?'),
		).toBe('financial_summary')
	})

	it('detects vehicle policy lookup', () => {
		expect(classifyInsuranceAskIntent('Which policy covers my XEV 9E?')).toBe(
			'policy_lookup',
		)
	})
})

describe('buildInsuranceAskTurn', () => {
	it('returns conversational protection overview grounded in policies', () => {
		const knowledge = buildKnowledge()
		const turn = buildInsuranceAskTurn({
			knowledge,
			question: 'Summarize my protection.',
			memberId: 'member-1',
			memberName: 'Nivedan',
			sessionKey: 'insurance:test-session',
		})

		expect(turn.domains).toEqual(['insurance'])
		expect(turn.answer).toMatch(/based on your policies/i)
		expect(turn.answer).not.toMatch(/policy id|knowledge graph|ocr/i)
		expect(turn.citations.length).toBeGreaterThan(0)
		expect(turn.followUpQuestions.length).toBeGreaterThan(0)
		expect(turn.trust?.directAnswer).toBe(turn.answer)
	})

	it('answers life insurance totals from knowledge', () => {
		const knowledge = buildKnowledge()
		const turn = buildInsuranceAskTurn({
			knowledge,
			question: 'What is my total life insurance?',
			memberId: 'member-1',
			memberName: 'Nivedan',
			sessionKey: 'insurance:test-session-life',
		})

		expect(turn.answer).toMatch(/life cover/i)
		expect(turn.answer).toMatch(/3 crore|₹3/i)
	})

	it('answers member coverage questions', () => {
		const knowledge = buildKnowledge()
		const turn = buildInsuranceAskTurn({
			knowledge,
			question: 'Show all policies covering Advika.',
			memberId: 'member-1',
			memberName: 'Nivedan',
			sessionKey: 'insurance:test-session-member',
		})

		expect(turn.answer).toMatch(/Advika/i)
		expect(
			turn.citations.some((item) => item.reportTitle.includes('Health')),
		).toBe(true)
	})

	it('summarizes claims history', () => {
		const knowledge = buildKnowledge()
		const turn = buildInsuranceAskTurn({
			knowledge,
			question: 'What claims have I made?',
			memberId: 'member-1',
			memberName: 'Nivedan',
			sessionKey: 'insurance:test-session-claims',
		})

		expect(turn.answer).toMatch(/claim/i)
		expect(turn.answer).toMatch(/based on your records/i)
	})
})
