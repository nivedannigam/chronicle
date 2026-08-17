import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	isInsuranceExtractionSufficient,
	isVehicleExtractionSufficient,
	parseInsuranceExtractionJson,
	parseVehicleExtractionJson,
	validateInsuranceExtractionJson,
} from '@/shared/ai/prompt/extract-domain-document.parser'
import { orchestrateDomainDocumentExtraction } from '@/features/document-import/services/document-extraction-orchestrator.service'
import { extractTextFromStoredPdf } from '@/features/document-import/services/domain-document-text.service'
import {
	extractDomainDocumentWithAi,
	extractDomainDocumentWithAiDirect,
} from '@/shared/ai/transport/extract-domain-document.client'
import { isAskAiEdgeConfigured } from '@/shared/ai/transport/ask-ai-edge.client'
import { buildHealthReportFromAiDirectExtraction } from '@/features/health/services/health-ai-extraction.service'
import { invokeExtractMetricsAiDirectFromDocument } from '@/shared/ai/transport/extract-metrics-ai-edge.client'

vi.mock('@/shared/ai/transport/ask-ai-edge.client', () => ({
	isAskAiEdgeConfigured: vi.fn(() => true),
	assertAskAiEdgeConfigured: vi.fn(),
	invokeAskAiEdgeFunction: vi.fn(),
	AskAiEdgeInvokeError: class AskAiEdgeInvokeError extends Error {},
}))

vi.mock('@/shared/ai/config/ai-platform.config', () => ({
	loadAIPlatformConfig: () => ({ model: 'gemini-test' }),
}))

vi.mock(
	'@/features/document-import/services/domain-document-text.service',
	() => ({
		extractTextFromStoredPdf: vi.fn(),
	}),
)

vi.mock('@/shared/ai/transport/extract-domain-document.client', () => ({
	extractDomainDocumentWithAiDirect: vi.fn(),
	extractDomainDocumentWithAi: vi.fn(),
}))

vi.mock('@/shared/ai/transport/extract-metrics-ai-edge.client', async () => {
	const actual = await vi.importActual<
		typeof import('@/shared/ai/transport/extract-metrics-ai-edge.client')
	>('@/shared/ai/transport/extract-metrics-ai-edge.client')

	return {
		...actual,
		invokeExtractMetricsAiDirectFromDocument: vi.fn(),
	}
})

describe('document extraction validation', () => {
	it('accepts meaningful insurance extraction', () => {
		const extraction = parseInsuranceExtractionJson(
			JSON.stringify({
				insurer: 'ICICI Lombard',
				policyNumber: 'POL 123456',
				policyType: 'health',
				sumInsured: 2500000,
			}),
		)

		expect(isInsuranceExtractionSufficient(extraction)).toBe(true)
		expect(
			validateInsuranceExtractionJson(
				JSON.stringify({
					insurer: 'ICICI Lombard',
					policyNumber: 'POL 123456',
					policyType: 'health',
					sumInsured: 2500000,
				}),
			).policyNumber,
		).toBe('POL 123456')
	})

	it('rejects malformed insurance extraction', () => {
		expect(() =>
			validateInsuranceExtractionJson(JSON.stringify({ insurer: 'Only name' })),
		).toThrow(/insufficient structured data/i)
	})

	it('accepts meaningful vehicle extraction', () => {
		const extraction = parseVehicleExtractionJson(
			JSON.stringify({
				documentType: 'registration',
				registrationNumber: 'MH 12 AB 1234',
				make: 'Tata',
				model: 'Nexon',
			}),
		)

		expect(isVehicleExtractionSufficient(extraction)).toBe(true)
	})
})

describe('orchestrateDomainDocumentExtraction', () => {
	beforeEach(() => {
		vi.mocked(isAskAiEdgeConfigured).mockReturnValue(true)
	})

	it('A. uses AI direct for normal text PDF without OCR', async () => {
		vi.mocked(extractDomainDocumentWithAiDirect).mockResolvedValueOnce({
			target: 'insurance',
			method: 'ai_direct',
			extractedText: null,
			insurance: parseInsuranceExtractionJson(
				JSON.stringify({
					insurer: 'ICICI Lombard',
					policyNumber: 'POL 123456',
					policyType: 'health',
					sumInsured: 2500000,
				}),
			),
		})

		const result = await orchestrateDomainDocumentExtraction({
			target: 'insurance',
			userId: 'user-1',
			documentId: 'doc-1',
			fileName: 'policy.pdf',
			storagePath: 'users/user-1/policy.pdf',
			buildMetadataFallback: () => ({
				target: 'insurance',
				method: 'deterministic_fallback',
				extractedText: null,
			}),
		})

		expect(result.method).toBe('ai_direct')
		expect(extractTextFromStoredPdf).not.toHaveBeenCalled()
	})

	it('B. falls back to OCR when AI direct is insufficient', async () => {
		vi.mocked(extractDomainDocumentWithAiDirect).mockRejectedValueOnce(
			new Error('insufficient structured data'),
		)
		vi.mocked(extractTextFromStoredPdf).mockResolvedValueOnce({
			text: `${'Policy Number POL 123456\nInsurer ICICI Lombard\n'.repeat(12)}`,
			confidence: 0.9,
		})
		vi.mocked(extractDomainDocumentWithAi).mockResolvedValueOnce({
			target: 'insurance',
			method: 'ocr_fallback',
			extractedText: 'Policy Number POL 123456',
			insurance: parseInsuranceExtractionJson(
				JSON.stringify({
					insurer: 'ICICI Lombard',
					policyNumber: 'POL 123456',
					policyType: 'health',
					sumInsured: 2500000,
				}),
			),
		})

		const result = await orchestrateDomainDocumentExtraction({
			target: 'insurance',
			userId: 'user-1',
			documentId: 'doc-1',
			fileName: 'scan.pdf',
			storagePath: 'users/user-1/scan.pdf',
			buildMetadataFallback: () => ({
				target: 'insurance',
				method: 'deterministic_fallback',
				extractedText: null,
			}),
		})

		expect(result.method).toBe('ocr_fallback')
		expect(extractTextFromStoredPdf).toHaveBeenCalledTimes(1)
	})

	it('J. uses deterministic fallback when AI and OCR fail', async () => {
		vi.mocked(extractDomainDocumentWithAiDirect).mockRejectedValueOnce(
			new Error('cannot read document'),
		)
		vi.mocked(extractTextFromStoredPdf).mockRejectedValueOnce(
			new Error('ocr failed'),
		)

		const result = await orchestrateDomainDocumentExtraction({
			target: 'vehicles',
			userId: 'user-1',
			documentId: 'doc-1',
			fileName: 'rc.pdf',
			storagePath: 'users/user-1/rc.pdf',
			buildMetadataFallback: () => ({
				target: 'vehicles',
				method: 'deterministic_fallback',
				extractedText: null,
				vehicle: parseVehicleExtractionJson(
					JSON.stringify({
						documentType: 'registration',
						registrationNumber: 'MH 12 AB 1234',
						make: 'Tata',
						model: 'Nexon',
					}),
				),
			}),
		})

		expect(result.method).toBe('deterministic_fallback')
		expect(result.observability?.extractionSuccess).toBe(false)
	})
})

describe('health AI direct extraction', () => {
	it('E. skips metricless health documents', async () => {
		const result = await buildHealthReportFromAiDirectExtraction({
			report: {
				id: 'report-1',
				user_id: 'user-1',
				file_name: 'Feb 2026 - TMT.pdf',
				storage_path: 'users/user-1/tmt.pdf',
				status: 'processing',
			} as never,
		})

		expect(result).toBeNull()
		expect(invokeExtractMetricsAiDirectFromDocument).not.toHaveBeenCalled()
	})
})
