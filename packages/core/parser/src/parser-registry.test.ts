import { describe, expect, it } from 'vitest'
import { buildMockOcrDocumentResult } from '@chronicle/core-ocr'
import { detectDocumentType } from './document-type.detector.ts'
import { ParserRegistry, selectParser } from './parser-registry.ts'
import { PassportParser } from '../../../../src/features/documents/parsers/passport.parser.ts'
import { HealthReportParser } from '../../../../src/features/health/parsers/health.parser.ts'

describe('document-type detector', () => {
	it('detects health reports from lab keywords', () => {
		const input = {
			documentId: 'doc-1',
			fileName: 'lab-report.pdf',
			mimeType: 'application/pdf',
			ocrDocument: buildMockOcrDocumentResult(
				{
					id: 'doc-1',
					fileName: 'lab-report.pdf',
					storagePath: 'user/doc-1_lab-report.pdf',
					mimeType: 'application/pdf',
				},
				{ includeTables: true },
			),
		}

		expect(detectDocumentType(input)).toBe('health_report')
	})

	it('detects ecg and tmt filenames as health reports', () => {
		for (const fileName of [
			'2026 March ECG.pdf',
			'Feb 2026 - TMT.pdf',
			'company-wellness-plan.pdf',
		]) {
			expect(
				detectDocumentType({
					documentId: 'doc-ecg',
					fileName,
					mimeType: 'application/pdf',
					ocrDocument: {
						rawText: 'Clinical summary only.',
						pages: [
							{
								pageNumber: 1,
								text: 'Clinical summary only.',
								confidence: 0.9,
							},
						],
						tables: [],
						confidence: 0.9,
						metadata: {
							provider: 'mock',
							mimeType: 'application/pdf',
							fileName,
							language: 'en',
							pageCount: 1,
							tableCount: 0,
						},
						processingTimeMs: 100,
					},
				}),
			).toBe('health_report')
		}
	})

	it('detects passports from passport keywords', () => {
		const input = {
			documentId: 'doc-2',
			fileName: 'passport-scan.pdf',
			mimeType: 'application/pdf',
			ocrDocument: buildMockOcrDocumentResult(
				{
					id: 'doc-2',
					fileName: 'passport-scan.pdf',
					storagePath: 'user/doc-2_passport-scan.pdf',
					mimeType: 'application/pdf',
				},
				{ includeTables: false },
			),
		}

		expect(detectDocumentType(input)).toBe('passport')
	})

	it('returns unknown for generic PDFs without domain keywords', () => {
		const input = {
			documentId: 'doc-3',
			fileName: 'notes.pdf',
			mimeType: 'application/pdf',
			ocrDocument: {
				rawText: 'Project meeting notes — no structured fields.',
				pages: [
					{
						pageNumber: 1,
						text: 'Project meeting notes — no structured fields.',
						confidence: 0.9,
					},
				],
				tables: [],
				confidence: 0.9,
				metadata: {
					provider: 'mock',
					mimeType: 'application/pdf',
					fileName: 'notes.pdf',
					language: 'en',
					pageCount: 1,
					tableCount: 0,
				},
				processingTimeMs: 100,
			},
		}

		expect(detectDocumentType(input)).toBe('unknown')
	})
})

describe('parser registry', () => {
	it('selects registered health parser', async () => {
		const registry = new ParserRegistry()
		registry.register({ parser: new HealthReportParser() })

		const input = {
			documentId: 'doc-1',
			fileName: 'cbc-panel.pdf',
			mimeType: 'application/pdf',
			ocrDocument: buildMockOcrDocumentResult(
				{
					id: 'doc-1',
					fileName: 'cbc-panel.pdf',
					storagePath: 'user/doc-1_cbc-panel.pdf',
					mimeType: 'application/pdf',
				},
				{ includeTables: true },
			),
		}

		const parser = await selectParser(input, registry)
		expect(parser?.id).toBe('health-report')
	})

	it('prefers passport parser when registered before health', async () => {
		const registry = new ParserRegistry()
		registry.register({ parser: new PassportParser() })
		registry.register({ parser: new HealthReportParser() })

		const input = {
			documentId: 'doc-passport',
			fileName: 'john-passport.pdf',
			mimeType: 'application/pdf',
			ocrDocument: buildMockOcrDocumentResult(
				{
					id: 'doc-passport',
					fileName: 'john-passport.pdf',
					storagePath: 'user/doc-passport_john-passport.pdf',
					mimeType: 'application/pdf',
				},
				{ includeTables: false },
			),
		}

		const parser = await selectParser(input, registry)
		expect(parser?.id).toBe('passport')
	})
})
