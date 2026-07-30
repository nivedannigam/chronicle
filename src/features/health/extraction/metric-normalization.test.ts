import { describe, expect, it } from 'vitest'
import { buildMockOcrDocumentResult } from '@/features/document-intelligence/ocr/providers/mock-ocr.templates'
import { parseReportMetadata } from '@/features/health/extraction/health-metadata.parser'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'

describe('normalizeMetricName', () => {
	it('maps Fasting Glucose to fasting-glucose, not AST', () => {
		const result = normalizeMetricName('Fasting Glucose')

		expect(result.canonicalId).toBe('fasting-glucose')
		expect(result.displayName).toBe('Fasting Glucose')
	})

	it('maps AST (SGOT) to ast', () => {
		const result = normalizeMetricName('AST (SGOT)')

		expect(result.canonicalId).toBe('ast')
	})
})

describe('parseReportMetadata', () => {
	it('does not classify general checkup mock OCR as diabetes from metric rows', () => {
		const ocrDocument = buildMockOcrDocumentResult(
			{
				id: 'doc-1',
				userId: 'user-1',
				fileName: '2022 Jan - Complete Blood Test.pdf',
				storagePath: 'user/doc.pdf',
				mimeType: 'application/pdf',
				uploadedAt: '2026-01-14T00:00:00.000Z',
			},
			{ includeTables: true },
		)

		const metadata = parseReportMetadata(
			ocrDocument,
			'2022 Jan - Complete Blood Test.pdf',
		)

		expect(metadata.reportType).toBe('blood-count')
	})
})
