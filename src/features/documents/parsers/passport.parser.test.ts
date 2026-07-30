import { describe, expect, it } from 'vitest'
import { buildMockOcrDocumentResult } from '@chronicle/core-ocr'
import { PassportParser } from '@/features/documents/parsers/passport.parser'

describe('PassportParser', () => {
	it('parses passport OCR text into structured payload', async () => {
		const parser = new PassportParser()
		const ocrDocument = buildMockOcrDocumentResult(
			{
				id: 'doc-passport-1',
				fileName: 'john-doe-passport.pdf',
				storagePath: 'user/doc-passport-1_john-doe-passport.pdf',
				mimeType: 'application/pdf',
			},
			{ includeTables: false },
		)

		const input = {
			documentId: 'doc-passport-1',
			fileName: 'john-doe-passport.pdf',
			mimeType: 'application/pdf',
			ocrDocument,
		}

		expect(parser.canParse(input)).toBe(true)

		const parsed = await parser.parse(input)

		expect(parsed.documentType).toBe('passport')
		expect(parsed.parserId).toBe('passport')
		expect(parsed.payload.documentNumber).toBe('Z1234567')
		expect(parsed.payload.holderName).toBeTruthy()
		expect(parsed.payload.expiryDate).toBe('2030-01-01')
		expect(parsed.payload.mrzLine1).toContain('P<IND')
	})
})
