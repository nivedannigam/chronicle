import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { extractMetricsFromOcr } from '@/features/health/extraction/metric-extraction.engine'
import { isThyrocareOcrText } from '@/features/health/extraction/vendors/thyrocare-detection'
import { extractThyrocareMetricsFromText } from '@/features/health/extraction/vendors/thyrocare-text.extractor'
import { parseReportMetadata } from '@/features/health/extraction/health-metadata.parser'

const FIXTURE_DIR = path.resolve(import.meta.dirname, 'fixtures')

const MOCK_OCR_METADATA = {
	provider: 'google',
	mimeType: 'application/pdf',
	fileName: 'March 2026 - Thyrocare Test 2.pdf',
	pageCount: 12,
	tableCount: 0,
}

function loadFixture(name: string): string {
	return readFileSync(path.join(FIXTURE_DIR, name), 'utf8')
}

function mockOcrDocument(rawText: string) {
	return {
		rawText,
		tables: [],
		pages: [],
		confidence: 0.95,
		processingTimeMs: 1200,
		metadata: MOCK_OCR_METADATA,
	}
}

describe('thyrocare-text.extractor', () => {
	it('detects Thyrocare OCR text without explicit vendor name', () => {
		const text = loadFixture('thyrocare-combo-march-2026.ocr.txt')

		expect(isThyrocareOcrText(text)).toBe(true)
	})

	it('extracts combo report metrics from March 2026 fixture', () => {
		const text = loadFixture('thyrocare-combo-march-2026.ocr.txt')
		const rows = extractThyrocareMetricsFromText(text)
		const names = rows.map((row) => row.rawName.toUpperCase())

		expect(rows.length).toBeGreaterThan(15)
		expect(names.some((name) => name.includes('HEMOGLOBIN'))).toBe(true)
		expect(names.some((name) => name.includes('TOTAL CHOLESTEROL'))).toBe(true)
		expect(names.some((name) => name.includes('LDL'))).toBe(true)
		expect(names.some((name) => name.includes('COTININE'))).toBe(true)
		expect(names.some((name) => name.includes('HBSAG'))).toBe(true)
		expect(rows.some((row) => row.value.toUpperCase() === 'NEGATIVE')).toBe(
			true,
		)
	})

	it('integrates with extractMetricsFromOcr without OCR tables', () => {
		const text = loadFixture('thyrocare-combo-march-2026.ocr.txt')
		const result = extractMetricsFromOcr(mockOcrDocument(text))

		expect(result.metrics.length).toBeGreaterThan(15)
		expect(
			result.warnings.some((warning) => warning.includes('Thyrocare')),
		).toBe(true)
	})

	it('parses Thyrocare laboratory and report date metadata', () => {
		const text = loadFixture('thyrocare-combo-march-2026.ocr.txt')
		const metadata = parseReportMetadata(
			mockOcrDocument(text),
			'March 2026 - Thyrocare Test 2.pdf',
		)

		expect(metadata.laboratory).toBe('Thyrocare')
		expect(metadata.reportDate).toBe('2026-03-09')
	})
})
