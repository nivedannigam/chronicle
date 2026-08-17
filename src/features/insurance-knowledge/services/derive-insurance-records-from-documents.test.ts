import { describe, expect, it } from 'vitest'
import { deriveInsuranceRecordsFromDocuments } from '@/features/insurance-knowledge/services/derive-insurance-records-from-documents'
import type {
	InsuranceDocumentRecord,
	InsurancePolicyRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'

const basePolicy: InsurancePolicyRecord = {
	id: 'policy-1',
	userId: 'user-1',
	familyMemberId: null,
	policyNumber: 'POL-H-001',
	policyType: 'health',
	productName: 'Health Shield',
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
}

const baseDocument: InsuranceDocumentRecord = {
	id: 'doc-1',
	userId: 'user-1',
	familyMemberId: null,
	registryId: 'registry-1',
	fileName: 'health-premium.pdf',
	storagePath: 'users/user-1/docs/doc-1.pdf',
	documentKind: 'premium_receipt',
	status: 'completed',
	linkedPolicyIds: [],
	parsedData: null,
	uploadedAt: '2026-01-01T00:00:00.000Z',
	processedAt: '2026-01-15T00:00:00.000Z',
}

describe('deriveInsuranceRecordsFromDocuments', () => {
	it('derives premiums, members, and renewals from parsed_data extraction', () => {
		const result = deriveInsuranceRecordsFromDocuments({
			policies: [basePolicy],
			documents: [
				{
					...baseDocument,
					parsedData: {
						policyId: 'policy-1',
						insurerName: 'ICICI Lombard',
						extraction: {
							insurance: {
								premium: 18000,
								currency: 'INR',
								renewalDate: '2027-01-01',
								expiryDate: '2027-01-01',
								insuredMembers: ['Alice', 'Bob'],
							},
						},
					},
				},
			],
		})

		expect(result.premiums).toEqual([
			expect.objectContaining({
				policyId: 'policy-1',
				amount: 18000,
				currency: 'INR',
				frequency: 'annual',
				paidDate: '2026-01-15',
			}),
		])
		expect(result.members).toHaveLength(2)
		expect(result.members.map((member) => member.name)).toEqual([
			'Alice',
			'Bob',
		])
		expect(result.renewals).toEqual([
			expect.objectContaining({
				policyId: 'policy-1',
				renewalDate: '2027-01-01',
				newPremium: 18000,
			}),
		])
		expect(result.documents[0]?.linkedPolicyIds).toEqual(['policy-1'])
	})

	it('links documents to policies by policy number when policyId is missing', () => {
		const result = deriveInsuranceRecordsFromDocuments({
			policies: [basePolicy],
			documents: [
				{
					...baseDocument,
					id: 'doc-2',
					parsedData: {
						policyNumber: 'POL-H-001',
						extraction: {
							insurance: {
								premium: 12000,
								currency: 'INR',
								renewalDate: null,
								expiryDate: '2027-01-01',
								insuredMembers: [],
							},
						},
					},
				},
			],
		})

		expect(result.premiums[0]?.policyId).toBe('policy-1')
		expect(result.documents[0]?.linkedPolicyIds).toEqual(['policy-1'])
	})
})
