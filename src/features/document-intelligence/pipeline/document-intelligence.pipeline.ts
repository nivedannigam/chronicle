import { resolveDocumentContent } from '@/features/document-intelligence/content/resolve-document-content.service'
import type { Document } from '@/features/document-intelligence/domain'
import {
	getOcrErrorMessage,
	OcrProviderError,
} from '@/features/document-intelligence/ocr'
import type { HealthReport } from '@/features/health/domain/health-report.domain'
import { ensurePlatformParsersRegistered } from '@/features/document-intelligence/parsers/platform-parser.bootstrap'
import type {
	DocumentPipelineOutcome,
	PipelineProgressCallback,
} from '@/features/document-intelligence/pipeline/pipeline.types'
import {
	defaultParserRegistry,
	parseDocument,
	type ParserRegistry,
} from '@chronicle/core-parser'

export interface DocumentIntelligencePipelineDeps {
	parserRegistry?: ParserRegistry
}

export interface RunDocumentIntelligencePipelineInput {
	document: Document
	onProgress?: PipelineProgressCallback
}

const defaultDeps: DocumentIntelligencePipelineDeps = {
	parserRegistry: defaultParserRegistry,
}

function isHealthReportPayload(payload: unknown): payload is HealthReport {
	return (
		typeof payload === 'object' &&
		payload != null &&
		'metrics' in payload &&
		'metadata' in payload
	)
}

export async function runDocumentIntelligencePipeline(
	input: RunDocumentIntelligencePipelineInput,
	deps: DocumentIntelligencePipelineDeps = defaultDeps,
): Promise<DocumentPipelineOutcome> {
	const { document, onProgress } = input
	const parserRegistry = deps.parserRegistry ?? defaultParserRegistry

	ensurePlatformParsersRegistered()

	try {
		await onProgress?.({
			stage: 'processing',
			message: 'Extracting text and document structure',
		})

		const resolved = await resolveDocumentContent({
			userId: document.userId,
			documentId: document.id,
			fileName: document.fileName,
			storagePath: document.storagePath,
			uploadedAt: document.uploadedAt,
			mimeType: document.mimeType,
		})

		const ocrDocument = resolved.ocrDocument

		if (!ocrDocument) {
			throw new Error('Document content resolution did not return OCR payload.')
		}

		await onProgress?.({
			stage: 'ocr_complete',
			message:
				resolved.source === 'NATIVE_TEXT'
					? 'Document text extracted'
					: 'OCR extraction complete',
		})

		await onProgress?.({
			stage: 'parsed',
			message: 'Parsing structured document data',
		})

		const parsedDocument = await parseDocument(
			{
				documentId: document.id,
				fileName: document.fileName,
				mimeType: document.mimeType,
				ocrDocument,
			},
			parserRegistry,
		)

		await onProgress?.({
			stage: 'completed',
			message: 'Document parsed',
		})

		return {
			stage: 'completed',
			extractedText: ocrDocument.rawText,
			pageCount: ocrDocument.pages.length,
			confidence: ocrDocument.confidence,
			processingTimeMs: ocrDocument.processingTimeMs,
			ocrProvider: ocrDocument.metadata.provider,
			ocrMetadata: {
				...ocrDocument.metadata,
				contentSource: resolved.source,
			},
			ocrAttempts: resolved.ocrAttempts ?? 1,
			ocrDocument,
			parsedDocument,
			healthReport:
				parsedDocument.documentType === 'health_report' &&
				isHealthReportPayload(parsedDocument.payload)
					? parsedDocument.payload
					: undefined,
		}
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

export { defaultDeps as defaultDocumentIntelligencePipelineDeps }
