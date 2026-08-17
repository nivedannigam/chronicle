import { describe, expect, it } from 'vitest'
import { isPolicyDisplayReady } from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
import {
	normalizePolicyNumber,
	policyDedupeKey,
} from '@/features/insurance-knowledge/utils/policy-category-resolver'
import type { InsurancePolicyRecord } from '@/features/insurance-knowledge/types/insurance-record.types'

function makePolicy(
	overrides: Partial<InsurancePolicyRecord> = {},
): InsurancePolicyRecord {
	return {
		id: 'policy-1',
		userId: 'user-1',
		familyMemberId: null,
		policyNumber: 'POL-001',
		policyType: 'health',
		productName: 'Health Shield',
		insurerId: 'icici-lombard',
		status: 'active',
		inceptionDate: '2024-01-01',
		expiryDate: '2027-01-01',
		renewalDate: null,
		sumInsured: 500000,
		currency: 'INR',
		sourceDocumentIds: ['doc-1'],
		extractionMethod: 'llm',
		confidence: 0.9,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	}
}

describe('policyDedupeKey', () => {
	it('dedupes by normalized insurer and policy number', () => {
		const left = policyDedupeKey({
			insurerId: 'icici-lombard',
			policyNumber: 'pol 123',
		})
		const right = policyDedupeKey({
			insurerId: 'icici-lombard',
			policyNumber: normalizePolicyNumber('POL 123'),
		})

		expect(left).toBe(right)
		expect(left).not.toBe(
			policyDedupeKey({
				insurerId: 'hdfc-ergo',
				policyNumber: 'POL 123',
			}),
		)
	})
})

describe('isPolicyDisplayReady', () => {
	it('rejects placeholder insurer and zero-only coverage stubs', () => {
		expect(
			isPolicyDisplayReady(
				makePolicy({
					insurerId: 'unknown-insurer',
					sumInsured: 0,
					expiryDate: null,
					extractionMethod: 'metadata',
					confidence: 0.4,
				}),
			),
		).toBe(false)

		expect(
			isPolicyDisplayReady(
				makePolicy({
					policyNumber: 'policy-from-filename',
					sumInsured: 0,
					expiryDate: null,
					extractionMethod: 'metadata',
					confidence: 0.4,
				}),
			),
		).toBe(false)
	})

	it('accepts LLM-extracted policies with meaningful coverage', () => {
		expect(
			isPolicyDisplayReady(
				makePolicy({
					extractionMethod: 'llm',
					sumInsured: 2500000,
				}),
			),
		).toBe(true)
	})
})
