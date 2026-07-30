/** Minimal document shape required for OCR — no domain module assumptions. */
export interface OcrDocumentInput {
	id: string
	fileName: string
	storagePath: string
	mimeType: string
	userId?: string
	uploadedAt?: string
}
