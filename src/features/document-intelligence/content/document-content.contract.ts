import type { OcrDocumentResult } from '@chronicle/core-ocr'

/** Internal content acquisition source — not consumer-facing. */
export type DocumentContentSource = 'NATIVE_TEXT' | 'OCR' | 'IMAGE' | 'OTHER'

export interface ResolvedDocumentContent {
	content: string
	source: DocumentContentSource
	confidence: number | null
	metadata: {
		provider?: string | null
		pageCount?: number | null
		tableCount?: number | null
		processingTimeMs?: number | null
	}
	/** Populated when content came through the OCR provider stack (native or OCR). */
	ocrDocument?: OcrDocumentResult
	ocrAttempts?: number
}

export function resolveContentSourceFromProvider(
	provider: string | null | undefined,
): DocumentContentSource {
	if (provider === 'native-pdf-text') {
		return 'NATIVE_TEXT'
	}

	if (provider === 'mock') {
		return 'OTHER'
	}

	if (provider === 'google-document-ai' || provider === 'google') {
		return 'OCR'
	}

	return 'OCR'
}
