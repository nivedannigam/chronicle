import {
	DocumentAiProcessError,
	processDocumentAiChunk,
} from './document-ai-client.ts'
import { logStructured } from './google-auth.ts'
import {
	formatOcrUserMessage,
	GOOGLE_DOCUMENT_AI_LIMITS,
	mergeOcrChunks,
	type PageChunkRange,
	type ParsedOcrChunk,
	planPageChunks,
	readImagelessModeEnabled,
	resolveProviderPageLimit,
	splitPageRange,
} from './page-chunk-plan.ts'
import { countPdfPages } from './pdf-chunking.ts'
import {
	isImageMimeType,
	isPdfMimeType,
	formatUnsupportedHealthReportMimeError,
	normalizeHealthReportMimeType,
} from '../_shared/health-report-mime.ts'

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

interface ProcessRangeInput {
	documentBytes: Uint8Array
	totalPages: number
	range: PageChunkRange
	endpoint: string
	accessToken: string
	mimeType: string
	imagelessModeEnabled: boolean
	providerPageLimit: number
	correlationId: string
	usePageSelector: boolean
}

async function processPageRange(
	input: ProcessRangeInput,
): Promise<Array<{ chunk: ParsedOcrChunk; byteLength: number }>> {
	const {
		documentBytes,
		totalPages,
		range,
		endpoint,
		accessToken,
		mimeType,
		imagelessModeEnabled,
		providerPageLimit,
		correlationId,
		usePageSelector,
	} = input

	const shouldUseSelector = usePageSelector && range.pageCount < totalPages

	try {
		const parsed = await processDocumentAiChunk({
			endpoint,
			accessToken,
			documentBytes,
			mimeType,
			imagelessModeEnabled,
			detectedPageCount: totalPages,
			providerPageLimit,
			correlationId,
			pageRange: shouldUseSelector
				? { startPage: range.startPage, endPage: range.endPage }
				: undefined,
		})

		return [
			{
				byteLength: documentBytes.length,
				chunk: {
					...parsed,
					startPage: range.startPage,
					endPage: range.endPage,
				},
			},
		]
	} catch (error) {
		if (
			error instanceof DocumentAiProcessError &&
			error.isPageLimitExceeded &&
			range.pageCount > 1
		) {
			logStructured('ocr_chunk_split_retry', {
				correlationId,
				startPage: range.startPage,
				endPage: range.endPage,
				pageCount: range.pageCount,
				reason: 'PAGE_LIMIT_EXCEEDED',
				strategy: 'bisect_page_range',
			})

			const [leftRange, rightRange] = splitPageRange(
				range.startPage,
				range.endPage,
			)

			const [leftChunks, rightChunks] = await Promise.all([
				processPageRange({ ...input, range: leftRange, usePageSelector: true }),
				processPageRange({
					...input,
					range: rightRange,
					usePageSelector: true,
				}),
			])

			return [...leftChunks, ...rightChunks]
		}

		throw error
	}
}

async function runOrchestration(input: {
	documentBytes: Uint8Array
	fileName: string
	mimeType: string
	endpoint: string
	accessToken: string
	correlationId: string
	startedAt: number
	originalPageCount: number
	imagelessModeEnabled: boolean
	providerPageLimit: number
}): Promise<OrchestratedOcrResult> {
	const initialChunks = planPageChunks(
		input.originalPageCount,
		input.providerPageLimit,
	)
	const usePageSelector = initialChunks.length > 1

	logStructured('ocr_orchestration_started', {
		correlationId: input.correlationId,
		fileName: input.fileName,
		imagelessModeEnabled: input.imagelessModeEnabled,
		detectedPageCount: input.originalPageCount,
		providerPageLimit: input.providerPageLimit,
		chunkCount: initialChunks.length,
		byteLength: input.documentBytes.length,
		mimeType: input.mimeType,
	})

	const ocrStartedAt = Date.now()
	const chunkSizes: number[] = []
	const parsedChunks: ParsedOcrChunk[] = []

	for (const range of initialChunks) {
		const rangeResults = await processPageRange({
			documentBytes: input.documentBytes,
			totalPages: input.originalPageCount,
			range,
			endpoint: input.endpoint,
			accessToken: input.accessToken,
			mimeType: input.mimeType,
			imagelessModeEnabled: input.imagelessModeEnabled,
			providerPageLimit: input.providerPageLimit,
			correlationId: input.correlationId,
			usePageSelector,
		})

		for (const result of rangeResults) {
			chunkSizes.push(result.byteLength)
			parsedChunks.push(result.chunk)
		}
	}

	const ocrDurationMs = Date.now() - ocrStartedAt
	const mergeStartedAt = Date.now()
	const merged = mergeOcrChunks(parsedChunks, input.originalPageCount)
	const mergeDurationMs = Date.now() - mergeStartedAt
	const processingTimeMs = Date.now() - input.startedAt
	const chunkCount = parsedChunks.length

	logStructured('ocr_orchestration_succeeded', {
		correlationId: input.correlationId,
		imagelessModeEnabled: input.imagelessModeEnabled,
		detectedPageCount: input.originalPageCount,
		providerPageLimit: input.providerPageLimit,
		chunkCount,
		chunkSizes,
		chunkPageRanges: parsedChunks.map(
			(chunk) => `${chunk.startPage}-${chunk.endPage}`,
		),
		ocrDurationMs,
		mergeDurationMs,
		processingTimeMs,
		characters: merged.rawText.length,
	})

	return {
		rawText: merged.rawText,
		pages: merged.pages,
		tables: merged.tables,
		confidence: merged.confidence,
		metadata: {
			provider: 'google-document-ai',
			mimeType: input.mimeType,
			fileName: input.fileName,
			pageCount: input.originalPageCount,
			tableCount: merged.tables.length,
			correlationId: input.correlationId,
			originalPageCount: input.originalPageCount,
			chunkCount,
			imagelessMode: input.imagelessModeEnabled,
			providerLimit: input.providerPageLimit,
		},
		processingTimeMs,
		ocrDurationMs,
		mergeDurationMs,
		chunkSizes,
	}
}

export async function orchestrateDocumentOcr(input: {
	documentBytes: Uint8Array
	fileName: string
	mimeType: string
	endpoint: string
	accessToken: string
	correlationId: string
	startedAt: number
}): Promise<OrchestratedOcrResult> {
	const mimeType = normalizeHealthReportMimeType(input.mimeType)

	if (isImageMimeType(mimeType)) {
		return orchestrateImageOcr({ ...input, mimeType })
	}

	if (isPdfMimeType(mimeType)) {
		return orchestratePdfOcr({ ...input, mimeType })
	}

	throw new Error(formatUnsupportedHealthReportMimeError(mimeType))
}

async function orchestrateImageOcr(input: {
	documentBytes: Uint8Array
	fileName: string
	mimeType: string
	endpoint: string
	accessToken: string
	correlationId: string
	startedAt: number
}): Promise<OrchestratedOcrResult> {
	const ocrStartedAt = Date.now()

	logStructured('ocr_image_started', {
		correlationId: input.correlationId,
		fileName: input.fileName,
		mimeType: input.mimeType,
		byteLength: input.documentBytes.length,
	})

	const parsed = await processDocumentAiChunk({
		endpoint: input.endpoint,
		accessToken: input.accessToken,
		documentBytes: input.documentBytes,
		mimeType: input.mimeType,
		imagelessModeEnabled: false,
		detectedPageCount: 1,
		providerPageLimit: 1,
		correlationId: input.correlationId,
	})

	const ocrDurationMs = Date.now() - ocrStartedAt
	const processingTimeMs = Date.now() - input.startedAt
	const pageText = parsed.rawText
	const pageConfidence = parsed.confidence

	logStructured('ocr_image_succeeded', {
		correlationId: input.correlationId,
		mimeType: input.mimeType,
		ocrDurationMs,
		processingTimeMs,
		characters: pageText.length,
	})

	return {
		rawText: pageText,
		pages: [
			{
				pageNumber: 1,
				text: pageText,
				confidence: pageConfidence,
			},
		],
		tables: parsed.tables.map((table) => ({
			...table,
			pageNumber: 1,
		})),
		confidence: pageConfidence,
		metadata: {
			provider: 'google-document-ai',
			mimeType: input.mimeType,
			fileName: input.fileName,
			pageCount: 1,
			tableCount: parsed.tables.length,
			correlationId: input.correlationId,
			originalPageCount: 1,
			chunkCount: 1,
			imagelessMode: false,
			providerLimit: 1,
		},
		processingTimeMs,
		ocrDurationMs,
		mergeDurationMs: 0,
		chunkSizes: [input.documentBytes.length],
	}
}

async function orchestratePdfOcr(input: {
	documentBytes: Uint8Array
	fileName: string
	mimeType: string
	endpoint: string
	accessToken: string
	correlationId: string
	startedAt: number
}): Promise<OrchestratedOcrResult> {
	const imagelessModeEnabled = readImagelessModeEnabled()
	const originalPageCount = await countPdfPages(input.documentBytes)
	const imagelessLimit = resolveProviderPageLimit(
		GOOGLE_DOCUMENT_AI_LIMITS,
		true,
	)
	const standardLimit = resolveProviderPageLimit(
		GOOGLE_DOCUMENT_AI_LIMITS,
		false,
	)
	const configuredLimit = imagelessModeEnabled ? imagelessLimit : standardLimit

	const baseInput = {
		...input,
		originalPageCount,
		imagelessModeEnabled,
	}

	try {
		return await runOrchestration({
			...baseInput,
			providerPageLimit: configuredLimit,
		})
	} catch (error) {
		const shouldFallbackToStandardChunks =
			error instanceof DocumentAiProcessError &&
			error.isPageLimitExceeded &&
			imagelessModeEnabled &&
			originalPageCount > standardLimit &&
			configuredLimit > standardLimit

		if (shouldFallbackToStandardChunks) {
			logStructured('ocr_imageless_fallback', {
				correlationId: input.correlationId,
				detectedPageCount: originalPageCount,
				previousProviderPageLimit: configuredLimit,
				providerPageLimit: standardLimit,
				imagelessModeEnabled,
				reason: 'PAGE_LIMIT_EXCEEDED_with_imageless',
			})

			return await runOrchestration({
				...baseInput,
				providerPageLimit: standardLimit,
			})
		}

		if (error instanceof DocumentAiProcessError) {
			throw new Error(formatOcrUserMessage(error.message, originalPageCount))
		}

		throw error
	}
}
