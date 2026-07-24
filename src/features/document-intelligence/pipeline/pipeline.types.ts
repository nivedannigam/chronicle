export type DocumentPipelineStage =
	'uploaded' | 'queued' | 'processing' | 'parsed' | 'completed' | 'failed'

export interface DocumentPipelineProgress {
	stage: DocumentPipelineStage
	message: string
}

export interface DocumentPipelineResult {
	stage: 'completed'
	extractedText: string
	pageCount: number
	confidence: number
	processingTimeMs: number
	ocrProvider: string
	ocrMetadata: import('@/features/document-intelligence/ocr').OcrDocumentMetadata
	ocrAttempts: number
	ocrDocument: import('@/features/document-intelligence/ocr').OcrDocumentResult
	healthReport: import('@/features/document-intelligence/domain').HealthReport
}

export interface DocumentPipelineFailure {
	stage: 'failed'
	error: string
	errorCode?: import('@/features/document-intelligence/ocr').OcrErrorCode
}

export type DocumentPipelineOutcome =
	DocumentPipelineResult | DocumentPipelineFailure

export type PipelineProgressCallback = (
	progress: DocumentPipelineProgress,
) => void | Promise<void>
