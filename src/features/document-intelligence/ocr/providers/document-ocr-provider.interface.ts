import type { Document } from '@/features/document-intelligence/domain'
import type { OcrDocumentResult } from '@/features/document-intelligence/ocr/types/ocr-result.types'

export interface DocumentOCRProvider {
	readonly name: string
	extractText(document: Document): Promise<OcrDocumentResult>
	extractDocument(document: Document): Promise<OcrDocumentResult>
	getConfidence(result: OcrDocumentResult): number
}

/** @deprecated Use DocumentOCRProvider instead */
export type DocumentOCRService = DocumentOCRProvider
