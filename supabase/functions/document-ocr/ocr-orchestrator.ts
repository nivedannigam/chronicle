import {
	DocumentAiProcessError,
	processDocumentAiChunk,
} from './document-ai-client.ts'
import { logStructured } from './google-auth.ts'
import {
	GOOGLE_DOCUMENT_AI_LIMITS,
	type ParsedOcrChunk,
	readImagelessModeEnabled,
	resolveProviderPageLimit,
} from './page-chunk-plan.ts'
import { countPdfPages } from './pdf-chunking.ts'

export interface OrchestratedOcrResult {
	rawText: string
	pages: Array<{
		pageNumber: number
		text: string
		confidence: number
	}>
	tables: ParsedOcrChunk['tables']
	confidence: number
	metadata: {
		provider: string
		mimeType: string
		fileName: string
		pageCount: number
		tableCount: number
		correlationId: string
		originalPageCount: number
		chunkCount: number
		imagelessMode: boolean
		providerLimit: number
	}
	processingTimeMs: number
	ocrDurationMs: number
	mergeDurationMs: number
	chunkSizes: number[]
}

function buildSingleDocumentResult(input: {
	parsed: Omit<ParsedOcrChunk, 'startPage' | 'endPage'>
	fileName: string
	mimeType: string
	correlationId: string
	originalPageCount: number
	imagelessModeEnabled: boolean
	providerPageLimit: number
	startedAt: number
	ocrDurationMs: number
}): OrchestratedOcrResult {
	const rawText = input.parsed.rawText
	const confidence = input.parsed.confidence
	const pages = Array.from({ length: input.originalPageCount }, (_, index) => ({
		pageNumber: index + 1,
		text: rawText,
		confidence,
	}))

	return {
		rawText,
		pages,
		tables: input.parsed.tables,
		confidence,
		metadata: {
			provider: 'google-document-ai',
			mimeType: input.mimeType,
			fileName: input.fileName,
			pageCount: input.originalPageCount,
			tableCount: input.parsed.tables.length,
			correlationId: input.correlationId,
			originalPageCount: input.originalPageCount,
			chunkCount: 1,
			imagelessMode: input.imagelessModeEnabled,
			providerLimit: input.providerPageLimit,
		},
		processingTimeMs: Date.now() - input.startedAt,
		ocrDurationMs: input.ocrDurationMs,
		mergeDurationMs: 0,
		chunkSizes: [],
	}
}

/**
 * Single-request OCR orchestration (no PDF splitting).
 * Sends one Document AI processors.process call with imagelessMode when enabled.
 */
export async function orchestrateDocumentOcr(input: {
	pdfBytes: Uint8Array
	fileName: string
	mimeType: string
	endpoint: string
	accessToken: string
	correlationId: string
	startedAt: number
}): Promise<OrchestratedOcrResult> {
	const imagelessModeEnabled = readImagelessModeEnabled()
	const detectedPageCount = await countPdfPages(input.pdfBytes)
	const providerPageLimit = resolveProviderPageLimit(
		GOOGLE_DOCUMENT_AI_LIMITS,
		imagelessModeEnabled,
	)

	logStructured('ocr_orchestration_started', {
		correlationId: input.correlationId,
		fileName: input.fileName,
		imagelessModeEnabled,
		detectedPageCount,
		providerPageLimit,
		byteLength: input.pdfBytes.length,
		mimeType: input.mimeType,
	})

	const ocrStartedAt = Date.now()

	try {
		const parsed = await processDocumentAiChunk({
			endpoint: input.endpoint,
			accessToken: input.accessToken,
			pdfBytes: input.pdfBytes,
			mimeType: input.mimeType,
			imagelessModeEnabled,
			detectedPageCount,
			providerPageLimit,
			correlationId: input.correlationId,
		})

		const ocrDurationMs = Date.now() - ocrStartedAt

		logStructured('ocr_orchestration_succeeded', {
			correlationId: input.correlationId,
			imagelessModeEnabled,
			detectedPageCount,
			providerPageLimit,
			ocrDurationMs,
			characters: parsed.rawText.length,
			responsePageCount: parsed.pageCount,
		})

		return buildSingleDocumentResult({
			parsed,
			fileName: input.fileName,
			mimeType: input.mimeType,
			correlationId: input.correlationId,
			originalPageCount: detectedPageCount,
			imagelessModeEnabled,
			providerPageLimit,
			startedAt: input.startedAt,
			ocrDurationMs,
		})
	} catch (error) {
		if (error instanceof DocumentAiProcessError) {
			logStructured('ocr_orchestration_failed', {
				correlationId: input.correlationId,
				imagelessModeEnabled,
				detectedPageCount,
				providerPageLimit,
				status: error.status,
				isPageLimitExceeded: error.isPageLimitExceeded,
				isImagelessModeRejected: error.isImagelessModeRejected,
				error: error.errorText.slice(0, 1000),
			})

			if (
				error.isImagelessModeRejected &&
				detectedPageCount > GOOGLE_DOCUMENT_AI_LIMITS.standardPages
			) {
				throw new Error(
					`Document AI received the request in non-imageless mode despite imagelessModeEnabled=${imagelessModeEnabled}. ` +
						`Verify document-ocr is redeployed and GOOGLE_DOCUMENT_AI_IMAGELESS_MODE is not false. ` +
						`Processor may also require allowlisting for 30-page imageless mode. Raw: ${error.errorText}`,
				)
			}
		}

		throw error
	}
}
