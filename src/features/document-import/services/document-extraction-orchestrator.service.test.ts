import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	isInsuranceExtractionSufficient,
	isVehicleExtractionSufficient,
	parseInsuranceExtractionJson,
	parseVehicleExtractionJson,
	validateInsuranceExtractionJson,
} from '@/shared/ai/prompt/extract-domain-document.parser'
import { orchestrateDomainDocumentExtraction } from '@/features/document-import/services/document-extraction-orchestrator.service'
import { resolveDocumentContent } from '@/features/document-intelligence/content/resolve-document-content.service'
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
	'@/features/document-intelligence/content/resolve-document-content.service',
	() => ({
		resolveDocumentContent: vi.fn(),
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
		expect(resolveDocumentContent).not.toHaveBeenCalled()
	})

	it('B. uses native text content without OCR provider when AI direct fails', async () => {
		vi.mocked(extractDomainDocumentWithAiDirect).mockRejectedValueOnce(
			new Error('insufficient structured data'),
		)
		vi.mocked(resolveDocumentContent).mockResolvedValueOnce({
			content: `${'Policy Number POL 123456\nInsurer ICICI Lombard\n'.repeat(12)}`,
			source: 'NATIVE_TEXT',
			confidence: 0.95,
			metadata: { provider: 'native-pdf-text', pageCount: 1, tableCount: 0 },
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
		expect(resolveDocumentContent).toHaveBeenCalledTimes(1)
		expect(result.observability?.contentSource).toBe('NATIVE_TEXT')
	})

	it('C. falls back to OCR content when native text is unavailable', async () => {
		vi.mocked(extractDomainDocumentWithAiDirect).mockRejectedValueOnce(
			new Error('insufficient structured data'),
		)
		vi.mocked(resolveDocumentContent).mockResolvedValueOnce({
			content: `${'Policy Number POL 123456\nInsurer ICICI Lombard\n'.repeat(12)}`,
			source: 'OCR',
			confidence: 0.9,
			metadata: { provider: 'google-document-ai', pageCount: 1, tableCount: 0 },
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
		expect(result.observability?.contentSource).toBe('OCR')
	})

	it('J. uses deterministic fallback when AI and OCR fail', async () => {
		vi.mocked(extractDomainDocumentWithAiDirect).mockRejectedValueOnce(
			new Error('cannot read document'),
		)
		vi.mocked(resolveDocumentContent).mockRejectedValueOnce(
			new Error('content resolution failed'),
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
		expect(result.observability?.extractionStatus).toBe('NEEDS_REVIEW')
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
