import { describe, expect, it } from 'vitest'
import { buildMockOcrDocumentResult } from '@/features/document-intelligence/ocr/providers/mock-ocr.templates'
import { extractMetricsFromOcr } from '@/features/health/extraction/metric-extraction.engine'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import { parseReportMetadata } from '@/features/health/extraction/health-metadata.parser'

const PANELS = [
	{ fileName: 'CBC_Report.pdf', expectedMetric: 'Hemoglobin' },
	{ fileName: 'LFT_Report.pdf', expectedMetric: 'ALT (SGPT)' },
	{ fileName: 'KFT_Report.pdf', expectedMetric: 'Creatinine' },
	{ fileName: 'Lipid_Profile.pdf', expectedMetric: 'LDL Cholesterol' },
	{ fileName: 'Thyroid_Profile.pdf', expectedMetric: 'TSH' },
	{ fileName: 'Diabetes_HbA1c.pdf', expectedMetric: 'HbA1c' },
	{ fileName: 'Vitamin_Panel.pdf', expectedMetric: 'Vitamin D' },
] as const

describe('metric normalization', () => {
	it('normalizes SGPT to ALT (SGPT)', () => {
		const result = normalizeMetricName('SGPT')

		expect(result.displayName).toBe('ALT (SGPT)')
		expect(result.canonicalId).toBe('alt')
	})

	it('normalizes glycated hemoglobin to HbA1c', () => {
		const result = normalizeMetricName('Glycated Hemoglobin')

		expect(result.displayName).toBe('HbA1c')
	})

	it('does not map Fasting Glucose to AST', () => {
		const result = normalizeMetricName('Fasting Glucose')

		expect(result.canonicalId).toBe('fasting-glucose')
	})
})

describe('metric extraction across sample panels', () => {
	for (const panel of PANELS) {
		it(`extracts metrics from ${panel.fileName}`, () => {
			const ocrDocument = buildMockOcrDocumentResult(
				{
					id: 'doc-test',
					userId: 'user-test',
					fileName: panel.fileName,
					storagePath: 'user/doc.pdf',
					mimeType: 'application/pdf',
					uploadedAt: new Date().toISOString(),
				},
				{ includeTables: true },
			)

			const metadata = parseReportMetadata(ocrDocument, panel.fileName)
			const extraction = extractMetricsFromOcr(ocrDocument)

			expect(metadata.laboratory).not.toBe('Unknown Laboratory')
			expect(extraction.metrics.length).toBeGreaterThan(0)
			expect(
				extraction.metrics.some(
					(metric) => metric.displayName === panel.expectedMetric,
				),
			).toBe(true)
		})
	}
})
