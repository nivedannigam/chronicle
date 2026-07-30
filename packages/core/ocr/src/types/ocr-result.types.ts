export interface OcrPage {
	pageNumber: number
	text: string
	confidence: number
}

export interface OcrTableCell {
	row: number
	column: number
	text: string
	confidence?: number
}

export interface OcrTable {
	pageNumber: number
	rows: number
	columns: number
	cells: OcrTableCell[]
}

export interface OcrDocumentMetadata {
	provider: string
	mimeType: string
	fileName: string
	language?: string
	pageCount: number
	tableCount: number
	[key: string]: unknown
}

export interface OcrDocumentResult {
	rawText: string
	pages: OcrPage[]
	tables: OcrTable[]
	confidence: number
	metadata: OcrDocumentMetadata
	processingTimeMs: number
}

/** @deprecated Use OcrDocumentResult instead */
export type OcrExtractionResult = {
	text: string
	pageCount: number
	confidence: number
	provider: string
}

export function toLegacyOcrResult(
	result: OcrDocumentResult,
): OcrExtractionResult {
	return {
		text: result.rawText,
		pageCount: result.pages.length,
		confidence: result.confidence,
		provider: result.metadata.provider,
	}
}
