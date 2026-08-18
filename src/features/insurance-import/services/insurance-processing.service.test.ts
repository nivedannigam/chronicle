import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildInsuranceMetadataExtraction } from '@/features/document-import/services/domain-document-extraction.service'

const mockFrom = vi.fn()
const mockExtract = vi.fn()

vi.mock('@/lib/supabase', () => ({
	supabase: {
		from: (...args: unknown[]) => mockFrom(...args),
	},
}))

vi.mock(
	'@/features/document-import/services/domain-document-extraction.service',
	async () => {
		const actual = await vi.importActual<
			typeof import('@/features/document-import/services/domain-document-extraction.service')
		>('@/features/document-import/services/domain-document-extraction.service')

		return {
			...actual,
			extractRegistryDocumentForDomain: (...args: unknown[]) =>
				mockExtract(...args),
		}
	},
)

function createQueryChain(result: { data: unknown; error: unknown }) {
	const chain = {
		select: vi.fn(() => chain),
		eq: vi.fn(() => chain),
		insert: vi.fn(() => chain),
		update: vi.fn(() => chain),
		single: vi.fn(async () => result),
		then(
			onFulfilled: (value: typeof result) => unknown,
			onRejected?: (reason: unknown) => unknown,
		) {
			return Promise.resolve(result).then(onFulfilled, onRejected)
		},
	}

	return chain
}

describe('processInsuranceDocument', () => {
	beforeEach(() => {
		mockFrom.mockReset()
		mockExtract.mockReset()
	})

	it('uses metadata extraction when registry ids are missing', async () => {
		const updateChain = createQueryChain({ data: null, error: null })
		const insertChain = createQueryChain({
			data: { id: 'policy-1' },
			error: null,
		})
		const selectChain = createQueryChain({ data: [], error: null })

		mockFrom.mockImplementation((table: string) => {
			if (table === 'insurance_policies') {
				return {
					select: vi.fn(() => selectChain),
					insert: vi.fn(() => insertChain),
					update: vi.fn(() => updateChain),
				}
			}

			if (table === 'insurance_documents') {
				return {
					update: vi.fn(() => updateChain),
				}
			}

			return updateChain
		})

		const { processInsuranceDocument } =
			await import('@/features/insurance-import/services/insurance-processing.service')

		await processInsuranceDocument({
			userId: 'user-1',
			documentId: 'doc-1',
			fileName: 'health-policy.pdf',
			familyMemberId: null,
			categoryHint: 'health',
		})

		expect(mockExtract).not.toHaveBeenCalled()
	})

	it('uses folder path to classify health policies without an explicit hint', async () => {
		mockExtract.mockResolvedValue({
			download: { storagePath: 'users/user-1/docs/doc-1.pdf' },
			extraction: buildInsuranceMetadataExtraction({
				fileName: 'Policy.pdf',
				categoryHint: 'health',
			}),
		})

		const updateChain = createQueryChain({ data: null, error: null })
		const insertChain = createQueryChain({
			data: { id: 'policy-health' },
			error: null,
		})
		const selectChain = createQueryChain({ data: [], error: null })

		mockFrom.mockImplementation((table: string) => {
			if (table === 'insurance_policies') {
				return {
					select: vi.fn(() => selectChain),
					insert: vi.fn(() => insertChain),
					update: vi.fn(() => updateChain),
				}
			}

			if (table === 'insurance_documents') {
				return {
					update: vi.fn(() => updateChain),
				}
			}

			return updateChain
		})

		const { processInsuranceDocument } =
			await import('@/features/insurance-import/services/insurance-processing.service')

		await processInsuranceDocument({
			userId: 'user-1',
			documentId: 'doc-health',
			fileName: 'Policy.pdf',
			familyMemberId: null,
			folderPath: 'Insurance/Health/Policy.pdf',
			registryId: 'registry-1',
			externalFileId: 'file-1',
		})

		expect(mockExtract).toHaveBeenCalledWith(
			expect.objectContaining({
				categoryHint: 'health',
				folderPath: 'Insurance/Health/Policy.pdf',
			}),
		)
	})

	it('dedupes policies by normalized insurer and policy number on LLM extraction', async () => {
		mockExtract.mockResolvedValue({
			download: { storagePath: 'users/user-1/docs/doc-1.pdf' },
			extraction: {
				target: 'insurance',
				method: 'llm',
				extractedText: 'Policy number POL 123456',
				insurance: {
					insurer: 'ICICI Lombard',
					policyNumber: 'POL 123456',
					policyType: 'health',
					productName: 'Health Shield',
					inceptionDate: '2024-01-01',
					expiryDate: '2027-01-01',
					renewalDate: null,
					sumInsured: 2500000,
					premium: null,
					currency: 'INR',
					insuredMembers: [],
					documentKind: null,
					confidence: 0.9,
					rawFields: {},
				},
			},
		})

		const updateChain = createQueryChain({ data: null, error: null })
		const selectChain = createQueryChain({
			data: [
				{
					id: 'existing-policy',
					insurer_id: 'icici-lombard',
					policy_number: 'POL 123456',
				},
			],
			error: null,
		})
		const existingPolicyChain = createQueryChain({
			data: {
				source_document_ids: ['doc-old'],
				sum_insured: 1000000,
				expiry_date: '2026-01-01',
			},
			error: null,
		})

		mockFrom.mockImplementation((table: string) => {
			if (table === 'insurance_policies') {
				return {
					select: vi.fn((columns: string) => {
						if (columns.includes('source_document_ids')) {
							return existingPolicyChain
						}

						return selectChain
					}),
					insert: vi.fn(() =>
						createQueryChain({ data: { id: 'new' }, error: null }),
					),
					update: vi.fn(() => updateChain),
				}
			}

			if (table === 'insurance_documents') {
				return {
					update: vi.fn(() => updateChain),
				}
			}

			return updateChain
		})

		const { processInsuranceDocument } =
			await import('@/features/insurance-import/services/insurance-processing.service')

		const result = await processInsuranceDocument({
			userId: 'user-1',
			documentId: 'doc-2',
			fileName: 'health-policy.pdf',
			familyMemberId: null,
			categoryHint: 'health',
			registryId: 'registry-1',
			externalFileId: 'file-1',
		})

		expect(result.policyId).toBe('existing-policy')
		expect(mockExtract).toHaveBeenCalled()
	})
})

describe('buildInsuranceMetadataExtraction', () => {
	it('builds filename-based fallback without network calls', () => {
		const extraction = buildInsuranceMetadataExtraction({
			fileName: 'motor-policy.pdf',
			categoryHint: 'motor',
		})

		expect(extraction.method).toBe('deterministic_fallback')
		expect(extraction.insurance?.productName).toBe('motor-policy')
		expect(extraction.insurance?.policyType).toBe('motor')
	})
})

describe('insuranceDocumentNeedsReprocess', () => {
	it('flags failed documents and non-display-ready policies', async () => {
		const { insuranceDocumentNeedsReprocess } =
			await import('@/features/insurance-import/services/insurance-processing.service')

		expect(
			insuranceDocumentNeedsReprocess({
				document: { status: 'failed', parsedData: null },
				policy: null,
			}),
		).toBe(true)

		expect(
			insuranceDocumentNeedsReprocess({
				document: { status: 'completed', parsedData: {} },
				policy: {
					policyNumber: 'from-filename',
					insurerId: 'unknown-insurer',
					sumInsured: 0,
					expiryDate: null,
					extractionMethod: 'metadata',
					confidence: 0.2,
				},
			}),
		).toBe(true)

		expect(
			insuranceDocumentNeedsReprocess({
				document: { status: 'completed', parsedData: { policyId: 'policy-1' } },
				policy: {
					policyNumber: 'POL-H-001',
					insurerId: 'icici-lombard',
					sumInsured: 2500000,
					expiryDate: '2027-01-01',
					extractionMethod: 'llm',
					confidence: 0.9,
				},
			}),
		).toBe(false)
	})
})
