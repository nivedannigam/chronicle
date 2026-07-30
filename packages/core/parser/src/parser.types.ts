import type { OcrDocumentResult } from '@chronicle/core-ocr'

export type DocumentTypeId =
	| 'health_report'
	| 'passport'
	| 'insurance_policy'
	| 'tax_form'
	| 'invoice'
	| 'property_deed'
	| 'unknown'

export interface ParserInput {
	documentId: string
	fileName: string
	mimeType: string
	ocrDocument: OcrDocumentResult
}

export interface ParsedDocument<TPayload = unknown> {
	documentType: DocumentTypeId
	documentId: string
	parserId: string
	parserVersion: string
	extractedText: string
	payload: TPayload
	metadata: Record<string, unknown>
}

export interface DocumentParser<TPayload = unknown> {
	readonly id: string
	readonly documentType: DocumentTypeId
	readonly version: string
	canParse(input: ParserInput): boolean | Promise<boolean>
	parse(input: ParserInput): Promise<ParsedDocument<TPayload>>
}

export interface DocumentParserRegistration<TPayload = unknown> {
	parser: DocumentParser<TPayload>
	priority?: number
}
