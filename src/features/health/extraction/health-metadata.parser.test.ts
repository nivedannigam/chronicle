import { describe, expect, it } from 'vitest'
import { buildMockOcrDocumentResult } from '@/features/document-intelligence/ocr/providers/mock-ocr.templates'
import {
	identifyReportType,
	parseReportMetadata,
	resolveReportDateFromFileName,
} from '@/features/health/extraction/health-metadata.parser'
import type { Document } from '@/features/document-intelligence/domain'

function mockDocument(fileName: string): Document {
	return {
		id: 'doc-1',
		userId: 'user-1',
		fileName,
		storagePath: 'user/doc.pdf',
		mimeType: 'application/pdf',
		uploadedAt: '2026-01-14T00:00:00.000Z',
	}
}

function parseFromMockFileName(fileName: string) {
	const ocrDocument = buildMockOcrDocumentResult(mockDocument(fileName), {
		includeTables: true,
	})

	return parseReportMetadata(ocrDocument, fileName)
}

describe('identifyReportType', () => {
	it('classifies Complete Blood Test as blood-count from filename', () => {
		expect(identifyReportType('', '2022 Jan - Complete Blood Test.pdf')).toBe(
			'blood-count',
		)
	})

	it('does not classify Iron Test as diabetes', () => {
		expect(identifyReportType('', 'Iron Test 2026')).toBe('vitamin')
	})

	it('does not classify Full Body Checkup as diabetes', () => {
		expect(identifyReportType('', '2024 Mar - Full Body Checkup.pdf')).toBe(
			'general',
		)
	})

	it('does not classify Partial Checkup as diabetes', () => {
		expect(identifyReportType('', '2024 Oct - Partial Checkup.pdf')).toBe(
			'general',
		)
	})

	it('classifies Health Summary as health-summary from filename', () => {
		expect(identifyReportType('', '2023 - 2026 Health Summary')).toBe(
			'health-summary',
		)
	})

	it('classifies Serum Electrolytes as electrolytes from filename', () => {
		expect(identifyReportType('', '2023 Feb - Serum Electrolytes.pdf')).toBe(
			'electrolytes',
		)
	})
})

describe('resolveReportDateFromFileName', () => {
	it('parses year-month prefixes like 2023 Feb', () => {
		expect(
			resolveReportDateFromFileName('2023 Feb - Serum Electrolytes.pdf'),
		).toBe('2023-02-01')
	})

	it('parses dd/mm/yy fragments from filenames', () => {
		expect(
			resolveReportDateFromFileName('Blood Count Report 30/01/22 09:00 AM.pdf'),
		).toBe('2022-01-30')
	})
})

describe('parseReportMetadata with mock OCR', () => {
	it('regression: Complete Blood Test.pdf → blood-count', () => {
		expect(
			parseFromMockFileName('2022 Jan - Complete Blood Test.pdf').reportType,
		).toBe('blood-count')
	})

	it('Iron Test 2026 → not diabetes', () => {
		const metadata = parseFromMockFileName('Iron Test 2026')

		expect(metadata.reportType).not.toBe('diabetes')
		expect(metadata.reportType).toBe('vitamin')
	})

	it('Full Body Checkup → not diabetes', () => {
		const metadata = parseFromMockFileName('2024 Mar - Full Body Checkup.pdf')

		expect(metadata.reportType).not.toBe('diabetes')
		expect(metadata.reportType).toBe('general')
	})

	it('Partial Checkup → not diabetes', () => {
		expect(
			parseFromMockFileName('2024 Oct - Partial Checkup.pdf').reportType,
		).not.toBe('diabetes')
	})

	it('Health Summary → not diabetes', () => {
		expect(
			parseFromMockFileName('2023 - 2026 Health Summary').reportType,
		).not.toBe('diabetes')
	})
})
