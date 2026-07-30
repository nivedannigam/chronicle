import type { OcrDocumentInput } from '../types/ocr-document-input.types'
import type { OcrDocumentResult } from '../types/ocr-result.types'

export interface DocumentOCRProvider {
	readonly name: string
	extractText(document: OcrDocumentInput): Promise<OcrDocumentResult>
	extractDocument(document: OcrDocumentInput): Promise<OcrDocumentResult>
	getConfidence(result: OcrDocumentResult): number
}

/** @deprecated Use DocumentOCRProvider instead */
export type DocumentOCRService = DocumentOCRProvider
