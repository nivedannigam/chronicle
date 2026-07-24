import type { Document } from '@/features/document-intelligence/domain'
import { defaultOCRProvider } from '@/features/document-intelligence/ocr'
import type { DocumentOCRProvider } from '@/features/document-intelligence/ocr'
import {
	getOcrErrorMessage,
	OcrProviderError,
} from '@/features/document-intelligence/ocr'
import { runOcrWithRetry } from '@/features/document-intelligence/ocr'
import type { HealthReportParser } from '@/features/document-intelligence/parsers'
import { healthReportParser } from '@/features/document-intelligence/parsers/health-report-parser'
import type {
	DocumentPipelineOutcome,
	PipelineProgressCallback,
} from '@/features/document-intelligence/pipeline/pipeline.types'
import type { OcrDocumentResult } from '@/features/document-intelligence/ocr'

export interface DocumentIntelligencePipelineDeps {
	ocrProvider: DocumentOCRProvider
	parser: HealthReportParser
}

export interface RunDocumentIntelligencePipelineInput {
	document: Document
	onProgress?: PipelineProgressCallback
}

const defaultDeps: DocumentIntelligencePipelineDeps = {
	ocrProvider: defaultOCRProvider,
	parser: healthReportParser,
}

export async function runDocumentIntelligencePipeline(
	input: RunDocumentIntelligencePipelineInput,
	deps: DocumentIntelligencePipelineDeps = defaultDeps,
): Promise<DocumentPipelineOutcome> {
	const { document, onProgress } = input

	try {
		await onProgress?.({
			stage: 'processing',
			message: 'Extracting text and document structure',
		})

		const { result: ocrDocument, attempts } = await runOcrWithRetry(
			deps.ocrProvider,
			document,
		)

		await onProgress?.({
			stage: 'parsed',
			message: 'Parsing structured health data',
		})

		const healthReport = await deps.parser.parse({
			documentId: document.id,
			fileName: document.fileName,
			ocrDocument,
		})

		await onProgress?.({
			stage: 'completed',
			message: 'Health report created',
		})

		return buildSuccessOutcome(ocrDocument, healthReport, attempts)
	} catch (error) {
		const message =
			error instanceof OcrProviderError
				? getOcrErrorMessage(error)
				: error instanceof Error
					? error.message
					: 'Document processing failed.'

		await onProgress?.({
			stage: 'failed',
			message,
		})

		return {
			stage: 'failed',
			error: message,
			errorCode: error instanceof OcrProviderError ? error.code : 'ocr_failure',
		}
	}
}

function buildSuccessOutcome(
	ocrDocument: OcrDocumentResult,
	healthReport: import('@/features/document-intelligence/domain').HealthReport,
	attempts: number,
): Extract<DocumentPipelineOutcome, { stage: 'completed' }> {
	return {
		stage: 'completed',
		extractedText: ocrDocument.rawText,
		pageCount: ocrDocument.pages.length,
		confidence: ocrDocument.confidence,
		processingTimeMs: ocrDocument.processingTimeMs,
		ocrProvider: ocrDocument.metadata.provider,
		ocrMetadata: ocrDocument.metadata,
		ocrAttempts: attempts,
		ocrDocument,
		healthReport,
	}
}

export { defaultDeps as defaultDocumentIntelligencePipelineDeps }
