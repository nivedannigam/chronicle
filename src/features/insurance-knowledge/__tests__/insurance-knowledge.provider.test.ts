import { describe, expect, it } from 'vitest'
import { mergeInsuranceRecords } from '@/features/insurance-knowledge/services/merge-insurance-records'
import { rankInsurancePolicies } from '@/features/insurance-knowledge/engines/evidence-ranking.engine'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type {
	InsuranceClaimRecord,
	InsuranceCoverageRecord,
	InsuranceDocumentRecord,
	InsuranceInsurerRecord,
	InsuranceMemberRecord,
	InsuranceNomineeRecord,
	InsurancePolicyRecord,
	InsurancePremiumRecord,
	InsuranceRenewalRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'

const USER_ID = 'user-test-1'
const MEMBER_ID = 'member-owner'
const INSURER_ID = 'insurer-hdfc'
const POLICY_ID = 'policy-health-1'

function member(): FamilyMemberWithAliases {
	return {
		id: MEMBER_ID,
		userId: USER_ID,
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
	}
}

function insurer(): InsuranceInsurerRecord {
	return {
		id: INSURER_ID,
		canonicalName: 'HDFC ERGO',
		displayName: 'HDFC Ergo General Insurance',
		country: 'IN',
	}
}

function healthPolicy(
	overrides: Partial<InsurancePolicyRecord> = {},
): InsurancePolicyRecord {
	return {
		id: POLICY_ID,
		userId: USER_ID,
		familyMemberId: MEMBER_ID,
		policyNumber: 'POL-123456',
		policyType: 'health',
		productName: 'Optima Restore',
		insurerId: INSURER_ID,
		status: 'active',
		inceptionDate: '2024-04-01',
		expiryDate: '2027-03-31',
		renewalDate: '2027-03-01',
		sumInsured: 500000,
		currency: 'INR',
		sourceDocumentIds: ['doc-policy-1'],
		extractionMethod: 'llm',
		confidence: 0.92,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
		...overrides,
	}
}

function coverage(): InsuranceCoverageRecord {
	return {
		id: 'coverage-1',
		policyId: POLICY_ID,
		canonicalCoverageId: 'hospitalization',
		displayName: 'Hospitalization',
		sumInsured: 500000,
		sublimit: null,
		deductible: null,
		copay: null,
		waitingPeriodDays: 30,
		status: 'active',
	}
}

function insuredMember(): InsuranceMemberRecord {
	return {
		id: 'member-1',
		policyId: POLICY_ID,
		name: 'Nivedan',
		relationship: 'self',
		dateOfBirth: '1990-01-01',
		familyMemberId: MEMBER_ID,
	}
}

function nominee(): InsuranceNomineeRecord {
	return {
		id: 'nominee-1',
		policyId: POLICY_ID,
		name: 'Spouse',
		relationship: 'spouse',
		sharePercent: 100,
	}
}

function premium(): InsurancePremiumRecord {
	return {
		id: 'premium-1',
		policyId: POLICY_ID,
		amount: 18500,
		currency: 'INR',
		frequency: 'annual',
		dueDate: '2027-03-01',
		paidDate: '2026-03-01',
		sourceDocumentId: 'doc-renewal-1',
	}
}

function renewal(): InsuranceRenewalRecord {
	return {
		id: 'renewal-1',
		policyId: POLICY_ID,
		renewalDate: '2026-03-01',
		previousPremium: 17000,
		newPremium: 18500,
		status: 'paid',
		sourceDocumentId: 'doc-renewal-1',
	}
}

function claim(): InsuranceClaimRecord {
	return {
		id: 'claim-1',
		policyId: POLICY_ID,
		claimNumber: 'CLM-789',
		claimType: 'cashless',
		filedDate: '2025-11-15',
		settledDate: '2025-12-01',
		claimedAmount: 85000,
		approvedAmount: 82000,
		status: 'paid',
		providerName: 'Apollo Hospital',
	}
}

function document(): InsuranceDocumentRecord {
	return {
		id: 'doc-policy-1',
		userId: USER_ID,
		familyMemberId: MEMBER_ID,
		fileName: 'HDFC_Optima_Restore.pdf',
		storagePath: 'insurance/health/HDFC_Optima_Restore.pdf',
		documentKind: 'policy_schedule',
		status: 'completed',
		linkedPolicyIds: [POLICY_ID],
		parsedData: null,
		uploadedAt: '2026-01-15T00:00:00.000Z',
		processedAt: '2026-01-15T01:00:00.000Z',
	}
}

function rawData(
	overrides: Partial<InsuranceKnowledgeRawData> = {},
): InsuranceKnowledgeRawData {
	return {
		policies: [healthPolicy()],
		coverages: [coverage()],
		members: [insuredMember()],
		nominees: [nominee()],
		premiums: [premium()],
		renewals: [renewal()],
		claims: [claim()],
		benefits: [
			{ id: 'benefit-1', policyId: POLICY_ID, description: 'AYUSH treatment' },
		],
		exclusions: [
			{
				id: 'exclusion-1',
				policyId: POLICY_ID,
				description: 'Cosmetic surgery',
			},
		],
		documents: [document()],
		insurers: [insurer()],
		familyMembers: [member()],
		importRegistry: [],
		...overrides,
	}
}

describe('InsuranceKnowledgeProvider', () => {
	const provider = new InsuranceKnowledgeProvider({
		fetchRawData: async () => rawData(),
	})

	it('builds valid knowledge for a single health policy', () => {
		const knowledge = provider.buildFromRawData(rawData(), {
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
			accountOwnerMemberId: MEMBER_ID,
		})

		expect(knowledge.holder.userId).toBe(USER_ID)
		expect(knowledge.familyMember.displayName).toBe('Nivedan')
		expect(knowledge.policies).toHaveLength(1)
		expect(knowledge.policies[0]?.policyNumber).toBe('POL-123456')
		expect(knowledge.activePolicies).toHaveLength(1)
		expect(knowledge.coverages).toHaveLength(1)
		expect(knowledge.claims).toHaveLength(1)
		expect(knowledge.members).toHaveLength(1)
		expect(knowledge.nominees).toHaveLength(1)
		expect(knowledge.premiums).toHaveLength(1)
		expect(knowledge.renewals).toHaveLength(1)
		expect(knowledge.insurers).toHaveLength(1)
		expect(knowledge.documents).toHaveLength(1)
		expect(knowledge.protectionScore).toBeGreaterThan(0)
		expect(knowledge.summary.policyCount).toBe(1)
		expect(knowledge.confidence.overall).toBeGreaterThan(0)
		expect(knowledge.generatedAt).toBeTruthy()
		expect(knowledge.buildDurationMs).toBeGreaterThanOrEqual(0)
	})

	it('builds relationships between policy, member, insurer, and coverage', () => {
		const knowledge = provider.buildFromRawData(rawData(), {
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
		})

		expect(knowledge.relationships.length).toBeGreaterThan(0)

		const coversMember = knowledge.relationships.find(
			(rel) =>
				rel.relationshipType === 'covers' && rel.fromEntityId === POLICY_ID,
		)
		expect(coversMember).toBeTruthy()

		const issuedBy = knowledge.relationships.find(
			(rel) =>
				rel.relationshipType === 'issued_by' && rel.toEntityId === INSURER_ID,
		)
		expect(issuedBy).toBeTruthy()

		const containsCoverage = knowledge.relationships.find(
			(rel) =>
				rel.relationshipType === 'contains' && rel.toEntityType === 'Coverage',
		)
		expect(containsCoverage).toBeTruthy()
	})

	it('generates timeline events for purchase, renewal, premium, and claim', () => {
		const knowledge = provider.buildFromRawData(rawData(), {
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
		})

		const types = new Set(knowledge.timeline.map((event) => event.type))

		expect(types.has('policy_purchased')).toBe(true)
		expect(types.has('policy_renewed')).toBe(true)
		expect(types.has('premium_paid')).toBe(true)
		expect(types.has('claim_filed')).toBe(true)
		expect(types.has('claim_settled')).toBe(true)
		expect(types.has('document_imported')).toBe(true)
	})

	it('detects coverage gaps when life and motor policies are missing', () => {
		const knowledge = provider.buildFromRawData(rawData(), {
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
		})

		const gapCategories = knowledge.coverageGaps.map((gap) => gap.categoryId)

		expect(gapCategories).toContain('life_term')
		expect(gapCategories).toContain('motor')
		expect(knowledge.recommendations.length).toBeGreaterThan(0)
	})

	it('handles multiple policies across insurers with deduplication', () => {
		const duplicatePolicy = healthPolicy({
			id: 'policy-dup',
			policyNumber: 'pol-123456',
			updatedAt: '2026-02-01T00:00:00.000Z',
			confidence: 0.75,
		})
		const termPolicy = healthPolicy({
			id: 'policy-term-1',
			policyNumber: 'LIC-987654',
			policyType: 'life_term',
			productName: 'iProtect Smart',
			sumInsured: 10000000,
			expiryDate: '2046-04-01',
			renewalDate: null,
			sourceDocumentIds: ['doc-term-1'],
		})

		const knowledge = provider.buildFromRawData(
			rawData({
				policies: [healthPolicy(), duplicatePolicy, termPolicy],
				nominees: [
					nominee(),
					{
						id: 'nominee-term',
						policyId: 'policy-term-1',
						name: 'Parent',
						relationship: 'parent',
						sharePercent: 100,
					},
				],
			}),
			{
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
			},
		)

		expect(knowledge.policies).toHaveLength(2)
		expect(knowledge.coverageByCategory.length).toBe(5)
		expect(
			knowledge.coverageByCategory.find((item) => item.categoryId === 'health')
				?.activePolicyCount,
		).toBe(1)
		expect(
			knowledge.coverageByCategory.find(
				(item) => item.categoryId === 'life_term',
			)?.activePolicyCount,
		).toBe(1)
	})

	it('flags expiring policies and adds renewal limitations', () => {
		const expiringPolicy = healthPolicy({
			id: 'policy-expiring',
			policyNumber: 'EXP-001',
			expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
				.toISOString()
				.slice(0, 10),
			renewalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
				.toISOString()
				.slice(0, 10),
		})

		const knowledge = provider.buildFromRawData(
			rawData({ policies: [expiringPolicy] }),
			{ userId: USER_ID, familyMemberId: MEMBER_ID },
		)

		expect(knowledge.expiringPolicies).toHaveLength(1)
		expect(
			knowledge.limitations.some((item) => item.code === 'renewal_within_30d'),
		).toBe(true)
	})

	it('builds empty knowledge when no policies exist', () => {
		const knowledge = provider.buildFromRawData(
			rawData({
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
			}),
			{ userId: USER_ID, familyMemberId: MEMBER_ID },
		)

		expect(knowledge.policies).toHaveLength(0)
		expect(knowledge.protectionScore).toBeNull()
		expect(
			knowledge.limitations.some((item) => item.code === 'no_policies'),
		).toBe(true)
		expect(knowledge.summary.headline).toMatch(/No insurance policies/i)
	})
})

describe('mergeInsuranceRecords', () => {
	it('deduplicates policies by insurer and policy number', () => {
		const merged = mergeInsuranceRecords({
			policies: [
				healthPolicy(),
				healthPolicy({
					id: 'policy-dup',
					policyNumber: 'POL-123456',
					confidence: 0.5,
				}),
			],
			coverages: [coverage()],
			members: [insuredMember()],
			nominees: [],
			premiums: [],
			renewals: [],
			claims: [],
			benefits: [],
			exclusions: [],
			documents: [],
		})

		expect(merged.policies).toHaveLength(1)
		expect(merged.mergedPolicyIds.get('policy-dup')).toBe(POLICY_ID)
	})
})

describe('rankInsurancePolicies', () => {
	it('ranks expiring policies above inactive ones', () => {
		const ranked = rankInsurancePolicies([
			{
				id: 'inactive',
				policyNumber: 'IN-1',
				policyType: 'health',
				categoryId: 'health',
				productName: null,
				insurerId: INSURER_ID,
				insurerName: 'HDFC Ergo',
				status: 'expired',
				inceptionDate: null,
				expiryDate: '2024-01-01',
				renewalDate: null,
				sumInsured: 100000,
				currency: 'INR',
				isDisplayReady: true,
				needsReprocess: false,
				daysUntilExpiry: -100,
				isExpiringSoon: false,
				extractionMethod: 'llm',
				confidence: 0.9,
				sourceDocumentIds: [],
			},
			{
				id: 'expiring',
				policyNumber: 'EX-1',
				policyType: 'health',
				categoryId: 'health',
				productName: null,
				insurerId: INSURER_ID,
				insurerName: 'HDFC Ergo',
				status: 'active',
				inceptionDate: null,
				expiryDate: null,
				renewalDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
					.toISOString()
					.slice(0, 10),
				sumInsured: 500000,
				currency: 'INR',
				isDisplayReady: true,
				needsReprocess: false,
				daysUntilExpiry: 5,
				isExpiringSoon: true,
				extractionMethod: 'llm',
				confidence: 0.9,
				sourceDocumentIds: [],
			},
		])

		expect(ranked[0]?.id).toBe('expiring')
		expect(ranked[0]?.priority).toBe('critical')
	})
})
