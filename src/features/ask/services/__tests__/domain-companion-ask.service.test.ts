import { describe, expect, it, vi } from 'vitest'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import { resolveInsuranceEvidence } from '@/features/insurance/evidence/insurance-evidence.resolver'
import { buildDomainCompanionAskTurn } from '@/features/ask/services/domain-companion-ask.service'

vi.mock('@/shared/ai/companion/chronicle-companion-ai', () => ({
	createChronicleCompanionAI: () => ({
		ask: vi.fn(),
	}),
}))

vi.mock('@/shared/ai/config/ai-platform.config', () => ({
	isAIPlatformConfigured: () => false,
}))

const provider = new InsuranceKnowledgeProvider({
	fetchRawData: async () => ({}) as InsuranceKnowledgeRawData,
})

function buildKnowledge() {
	return provider.buildFromRawData(
		{
			policies: [
				{
					id: 'policy-1',
					userId: 'user-1',
					familyMemberId: null,
					policyNumber: 'POL-H-001',
					policyType: 'health',
					productName: 'ICICI Health Shield',
					insurerId: 'icici-lombard',
					status: 'active',
					inceptionDate: '2024-01-01',
					expiryDate: '2027-01-01',
					renewalDate: null,
					sumInsured: 2500000,
					currency: 'INR',
					sourceDocumentIds: ['doc-1'],
					extractionMethod: 'llm',
					confidence: 0.9,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
			],
			coverages: [],
			members: [],
			nominees: [],
			premiums: [
				{
					id: 'premium-1',
					policyId: 'policy-1',
					amount: 18000,
					currency: 'INR',
					frequency: 'annual',
					dueDate: '2027-01-01',
					paidDate: '2026-01-01',
					sourceDocumentId: 'doc-1',
				},
			],
			renewals: [],
			claims: [],
			benefits: [],
			exclusions: [],
			documents: [],
			insurers: [
				{
					id: 'icici-lombard',
					canonicalName: 'ICICI Lombard',
					displayName: 'ICICI Lombard',
					country: 'IN',
				},
			],
			familyMembers: [],
			importRegistry: [],
			timeline: [],
		},
		{
			userId: 'user-1',
			familyMemberId: null,
			accountOwnerMemberId: null,
		},
	)
}

describe('resolveInsuranceEvidence', () => {
	it('returns deterministic fact lookup lines without LLM', () => {
		const knowledge = buildKnowledge()
		const bundle = resolveInsuranceEvidence({
			knowledge,
			request: {
				question: 'What is my policy number?',
				questionType: 'FACT_LOOKUP',
				domain: 'insurance',
				subject: {},
			},
		})

		expect(bundle.summary.lines.join('\n')).toContain(
			'Policy number: POL-H-001',
		)
	})

	it('scopes evidence to an explicit policy id', () => {
		const knowledge = buildKnowledge()
		const bundle = resolveInsuranceEvidence({
			knowledge,
			request: {
				question: 'Tell me about this policy',
				questionType: 'STATUS_OVERVIEW',
				domain: 'insurance',
				subject: {},
			},
			scope: { policyId: 'policy-1' },
		})

		expect(bundle.summary.headline).toContain('ICICI Health Shield')
	})
})

describe('buildDomainCompanionAskTurn', () => {
	it('uses evidence resolver for FACT_LOOKUP without calling companion AI', async () => {
		const turn = await buildDomainCompanionAskTurn({
			domain: 'insurance',
			knowledge: buildKnowledge(),
			question: 'What is my policy number?',
			userId: 'user-1',
			familyMemberId: null,
			memberName: 'You',
			sessionKey: 'insurance:test',
		})

		expect(turn.answer).toContain('Policy number: POL-H-001')
		expect(turn.domains).toEqual(['insurance'])
	})

	it('returns premium FACT_LOOKUP lines from derived premium records', () => {
		const knowledge = buildKnowledge()
		const bundle = resolveInsuranceEvidence({
			knowledge,
			request: {
				question: 'How much premium do I pay?',
				questionType: 'FACT_LOOKUP',
				domain: 'insurance',
				subject: {},
			},
		})

		expect(bundle.summary.lines.join('\n')).toContain('Premium: 18000 INR')
	})
})
