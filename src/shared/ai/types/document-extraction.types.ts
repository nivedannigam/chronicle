export type DocumentExtractionMethod =
	| 'ai_direct'
	| 'ai_direct_chunked'
	| 'ocr_fallback'
	| 'deterministic_fallback'
	/** @deprecated Use ocr_fallback */
	| 'llm'
	/** @deprecated Use deterministic_fallback */
	| 'metadata_fallback'

export interface DocumentExtractionObservability {
	extractionMethod: DocumentExtractionMethod
	extractionSuccess: boolean
	attemptCount: number
	fallbackReason?: string | null
	processingDurationMs: number
	provider?: string | null
	model?: string | null
	contentSource?: string | null
	extractionStatus?: string | null
}

export interface AskAiDocumentAttachment {
	bucket: 'health-reports' | 'personal-documents'
	storagePath: string
	mimeType?: string
	fileName?: string
}

export function isAiStructuredExtractionMethod(
	method: DocumentExtractionMethod,
): boolean {
	return (
		method === 'ai_direct' ||
		method === 'ai_direct_chunked' ||
		method === 'ocr_fallback' ||
		method === 'llm'
	)
}
