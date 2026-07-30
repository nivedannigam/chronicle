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
	pdfBytes: Uint8Array
	totalPages: number
	range: PageChunkRange
	endpoint: string
	accessToken: string
	mimeType: string
	imagelessMode: boolean
	correlationId: string
	usePageSelector: boolean
}

async function processPageRange(
	input: ProcessRangeInput,
): Promise<Array<{ chunk: ParsedOcrChunk; byteLength: number }>> {
	const {
		pdfBytes,
		totalPages,
		range,
		endpoint,
		accessToken,
		mimeType,
		imagelessMode,
		correlationId,
		usePageSelector,
	} = input

	const shouldUseSelector = usePageSelector && range.pageCount < totalPages

	try {
		const parsed = await processDocumentAiChunk({
			endpoint,
			accessToken,
			pdfBytes,
			mimeType,
			imagelessMode,
			pageRange: shouldUseSelector
				? { startPage: range.startPage, endPage: range.endPage }
				: undefined,
		})

		return [
			{
				byteLength: pdfBytes.length,
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
	pdfBytes: Uint8Array
	fileName: string
	mimeType: string
	endpoint: string
	accessToken: string
	correlationId: string
	startedAt: number
	originalPageCount: number
	imagelessMode: boolean
	providerLimit: number
}): Promise<OrchestratedOcrResult> {
	const initialChunks = planPageChunks(
		input.originalPageCount,
		input.providerLimit,
	)
	const usePageSelector = initialChunks.length > 1

	logStructured('ocr_orchestration_started', {
		correlationId: input.correlationId,
		fileName: input.fileName,
		pageCount: input.originalPageCount,
		providerLimit: input.providerLimit,
		chunkCount: initialChunks.length,
		imagelessMode: input.imagelessMode,
		byteLength: input.pdfBytes.length,
	})

	const ocrStartedAt = Date.now()
	const chunkSizes: number[] = []
	const parsedChunks: ParsedOcrChunk[] = []

	for (const range of initialChunks) {
		const rangeResults = await processPageRange({
			pdfBytes: input.pdfBytes,
			totalPages: input.originalPageCount,
			range,
			endpoint: input.endpoint,
			accessToken: input.accessToken,
			mimeType: input.mimeType,
			imagelessMode: input.imagelessMode,
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
		pageCount: input.originalPageCount,
		providerLimit: input.providerLimit,
		chunkCount,
		chunkSizes,
		chunkPageRanges: parsedChunks.map(
			(chunk) => `${chunk.startPage}-${chunk.endPage}`,
		),
		ocrDurationMs,
		mergeDurationMs,
		processingTimeMs,
		characters: merged.rawText.length,
		imagelessMode: input.imagelessMode,
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
			imagelessMode: input.imagelessMode,
			providerLimit: input.providerLimit,
		},
		processingTimeMs,
		ocrDurationMs,
		mergeDurationMs,
		chunkSizes,
	}
}

export async function orchestrateDocumentOcr(input: {
	pdfBytes: Uint8Array
	fileName: string
	mimeType: string
	endpoint: string
	accessToken: string
	correlationId: string
	startedAt: number
}): Promise<OrchestratedOcrResult> {
	const imagelessMode = readImagelessModeEnabled()
	const originalPageCount = await countPdfPages(input.pdfBytes)
	const imagelessLimit = resolveProviderPageLimit(
		GOOGLE_DOCUMENT_AI_LIMITS,
		true,
	)
	const standardLimit = resolveProviderPageLimit(
		GOOGLE_DOCUMENT_AI_LIMITS,
		false,
	)
	const configuredLimit = imagelessMode ? imagelessLimit : standardLimit

	const baseInput = {
		...input,
		originalPageCount,
		imagelessMode,
	}

	try {
		return await runOrchestration({
			...baseInput,
			providerLimit: configuredLimit,
		})
	} catch (error) {
		const shouldFallbackToStandardChunks =
			error instanceof DocumentAiProcessError &&
			error.isPageLimitExceeded &&
			imagelessMode &&
			originalPageCount > standardLimit &&
			configuredLimit > standardLimit

		if (shouldFallbackToStandardChunks) {
			logStructured('ocr_imageless_fallback', {
				correlationId: input.correlationId,
				pageCount: originalPageCount,
				previousProviderLimit: configuredLimit,
				providerLimit: standardLimit,
				imagelessMode,
				reason: 'PAGE_LIMIT_EXCEEDED_with_imageless',
			})

			return await runOrchestration({
				...baseInput,
				providerLimit: standardLimit,
			})
		}

		if (error instanceof DocumentAiProcessError) {
			throw new Error(formatOcrUserMessage(error.message, originalPageCount))
		}

		throw error
	}
}
