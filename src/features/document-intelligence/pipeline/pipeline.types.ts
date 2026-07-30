import type { ParsedDocument } from '@chronicle/core-parser'
import type { HealthReport } from '@/features/health/domain/health-report.domain'
import type {
	OcrDocumentMetadata,
	OcrDocumentResult,
	OcrErrorCode,
} from '@/features/document-intelligence/ocr'

export type DocumentPipelineStage =
	| 'uploaded'
	| 'queued'
	| 'processing'
	| 'ocr_complete'
	| 'parsed'
	| 'completed'
	| 'failed'

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
	ocrMetadata: OcrDocumentMetadata
	ocrAttempts: number
	ocrDocument: OcrDocumentResult
	parsedDocument: ParsedDocument<unknown>
	healthReport?: HealthReport
}

export interface DocumentPipelineFailure {
	stage: 'failed'
	error: string
	errorCode?: OcrErrorCode
}

export type DocumentPipelineOutcome =
	DocumentPipelineResult | DocumentPipelineFailure

export type PipelineProgressCallback = (
	progress: DocumentPipelineProgress,
) => void | Promise<void>
