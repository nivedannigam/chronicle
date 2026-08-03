import { describe, expect, it } from 'vitest'
import { buildMockOcrDocumentResult } from '@/features/document-intelligence/ocr/providers/mock-ocr.templates'
import {
	formatLaboratoryDisplayName,
	formatPatientNameDisplay,
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
		expect(identifyReportType('', 'Iron Test 2026')).toBe('iron')
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
		expect(metadata.reportType).toBe('iron')
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

describe('formatLaboratoryDisplayName', () => {
	it('rejects OCR junk like & Diagnostics', () => {
		expect(formatLaboratoryDisplayName('& Diagnostics')).toBe('Medical center')
	})

	it('rejects single-word OCR noise', () => {
		expect(formatLaboratoryDisplayName('No')).toBe('Medical center')
		expect(formatLaboratoryDisplayName('Technologist')).toBe('Medical center')
	})

	it('keeps valid laboratory names', () => {
		expect(formatLaboratoryDisplayName('Qtest Kharadi')).toBe('Qtest Kharadi')
		expect(formatLaboratoryDisplayName('Thyrocare')).toBe('Thyrocare')
	})
})

function mockOcrDocument(rawText: string) {
	return {
		rawText,
		tables: [],
		pages: [],
		confidence: 0.95,
		processingTimeMs: 1200,
		metadata: {
			provider: 'mock',
			mimeType: 'application/pdf',
			fileName: 'Blood Test.pdf',
			pageCount: 1,
			tableCount: 0,
		},
	}
}

describe('resolveLaboratory via parseReportMetadata', () => {
	it('parses Organization: label from Qtest-style reports', () => {
		const metadata = parseReportMetadata(
			mockOcrDocument(
				'Organization:Qtest Kharadi\nPatient Name: John Doe\nReport Date: 10 Mar 2026',
			),
			'Blood Test.pdf',
		)

		expect(metadata.laboratory).toBe('Qtest Kharadi')
	})

	it('does not match Lab Technologist as a laboratory name', () => {
		const metadata = parseReportMetadata(
			mockOcrDocument(
				'Lab Technologist: Dr Smith\nLaboratory: Metropolis Healthcare',
			),
			'Blood Test.pdf',
		)

		expect(metadata.laboratory).toBe('Metropolis Healthcare')
	})

	it('parses Qtest glued header from real report layout', () => {
		const metadata = parseReportMetadata(
			mockOcrDocument(
				'Patient Name:MR. NIVEDAN NIGAMRegistered on:23/04/2026 08:24:55\nDBO/Age/Gender:24/05/1980 / 45 Yrs. / MCollected on:23/04/2026 08:25:42\nPatient ID:17920Reported on:23/04/2026 10:04:50\nReferral:DR. SELFPrinted on:23/04/2026 15:11:34\nOrganization:QTEST KHARADI',
			),
			'Iron Test 2026.pdf',
		)

		expect(metadata.laboratory).toBe('QTEST KHARADI')
		expect(metadata.patientName).toBe('MR. NIVEDAN NIGAM')
		expect(metadata.doctorName).toBe('DR. SELF')
		expect(metadata.referenceNumber).toBe('17920')
	})

	it('rejects junk reference numbers like temperature', () => {
		const metadata = parseReportMetadata(
			mockOcrDocument(
				'Reference Range: temperature\nPatient ID:7051Reported on:02/07/2025',
			),
			'Report.pdf',
		)

		expect(metadata.referenceNumber).toBe('7051')
	})
})

describe('formatPatientNameDisplay', () => {
	it('rejects template placeholders', () => {
		expect(formatPatientNameDisplay('DBO/Age/Gender')).toBeNull()
	})
})
