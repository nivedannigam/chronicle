import type {
	DocumentParser,
	DocumentTypeId,
	ParsedDocument,
	ParserInput,
} from '@chronicle/core-parser'
import { detectDocumentType } from '@chronicle/core-parser'
import type { PassportDocument } from '@/features/documents/domain/passport.domain'
import {
	buildDocumentTitle,
	extractDocumentMetadata,
} from '@/features/documents/extraction/document-metadata.engine'

const PARSER_ID = 'passport'
const PARSER_VERSION = '1.0.0'

function extractMrzLines(text: string): {
	line1: string | null
	line2: string | null
} {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)

	const mrzCandidates = lines.filter(
		(line) => line.startsWith('P<') || line.includes('<<'),
	)

	return {
		line1: mrzCandidates[0] ?? null,
		line2: mrzCandidates[1] ?? null,
	}
}

function extractNationality(
	text: string,
	mrzLine1: string | null,
): string | null {
	if (mrzLine1) {
		const match = mrzLine1.match(/^P<[A-Z]{3}/)

		if (match) {
			return match[0].slice(2)
		}
	}

	const match = text.match(/\bnationality[:\s]+([A-Za-z ]+)/i)

	return match?.[1]?.trim() ?? null
}

export class PassportParser implements DocumentParser<PassportDocument> {
	readonly id = PARSER_ID
	readonly documentType: DocumentTypeId = 'passport'
	readonly version = PARSER_VERSION

	canParse(input: ParserInput): boolean {
		return detectDocumentType(input) === 'passport'
	}

	async parse(input: ParserInput): Promise<ParsedDocument<PassportDocument>> {
		const metadata = extractDocumentMetadata({
			fileName: input.fileName,
			text: input.ocrDocument.rawText,
			categoryHint: 'identity',
		})
		const { line1, line2 } = extractMrzLines(input.ocrDocument.rawText)
		const title = buildDocumentTitle({
			fileName: input.fileName,
			categoryId: metadata.categoryId,
			subCategoryId: metadata.subCategoryId ?? 'passport',
			documentNumber: metadata.documentNumber,
		})

		const payload: PassportDocument = {
			id: crypto.randomUUID(),
			documentId: input.documentId,
			documentNumber: metadata.documentNumber,
			holderName: metadata.holderName,
			nationality: extractNationality(input.ocrDocument.rawText, line1),
			issueDate: metadata.issueDate,
			expiryDate: metadata.expiryDate,
			issuer: metadata.issuer,
			mrzLine1: line1,
			mrzLine2: line2,
			extractedText: input.ocrDocument.rawText,
			parserVersion: PARSER_VERSION,
			createdAt: new Date().toISOString(),
		}

		return {
			documentType: 'passport',
			documentId: input.documentId,
			parserId: this.id,
			parserVersion: this.version,
			extractedText: input.ocrDocument.rawText,
			payload,
			metadata: {
				title,
				categoryId: metadata.categoryId,
				subCategoryId: metadata.subCategoryId,
				documentNumber: metadata.documentNumber,
				expiryDate: metadata.expiryDate,
				holderName: metadata.holderName,
				confidence: metadata.confidence,
			},
		}
	}
}

export const passportParser = new PassportParser()
