import {
	DocumentAiProcessError,
	processDocumentAiChunk,
} from './document-ai-client.ts'
import { logStructured } from './google-auth.ts'
import {
	mergeOcrChunks,
	type PageChunkRange,
	type ParsedOcrChunk,
	planPageChunks,
	readImagelessModeEnabled,
	readMaxPagesPerChunk,
	splitPageRange,
} from './page-chunk-plan.ts'
import { countPdfPages, extractPdfPageRange } from './pdf-chunking.ts'

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
	} = input

	const rangeBytes =
		range.startPage === 1 && range.endPage === totalPages
			? pdfBytes
			: await extractPdfPageRange(pdfBytes, range.startPage, range.endPage)

	try {
		const parsed = await processDocumentAiChunk({
			endpoint,
			accessToken,
			pdfBytes: rangeBytes,
			mimeType,
			imagelessMode,
		})

		return [
			{
				byteLength: rangeBytes.length,
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
				byteLength: rangeBytes.length,
				reason: 'PAGE_LIMIT_EXCEEDED',
			})

			const [leftRange, rightRange] = splitPageRange(
				range.startPage,
				range.endPage,
			)

			const [leftChunks, rightChunks] = await Promise.all([
				processPageRange({ ...input, range: leftRange }),
				processPageRange({ ...input, range: rightRange }),
			])

			return [...leftChunks, ...rightChunks]
		}

		throw error
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
	const maxPagesPerChunk = readMaxPagesPerChunk(imagelessMode)
	const originalPageCount = await countPdfPages(input.pdfBytes)
	const initialChunks = planPageChunks(originalPageCount, maxPagesPerChunk)

	logStructured('ocr_orchestration_started', {
		correlationId: input.correlationId,
		fileName: input.fileName,
		originalPageCount,
		chunkCount: initialChunks.length,
		maxPagesPerChunk,
		imagelessMode,
		byteLength: input.pdfBytes.length,
	})

	const ocrStartedAt = Date.now()
	const chunkSizes: number[] = []
	const parsedChunks: ParsedOcrChunk[] = []

	for (const range of initialChunks) {
		const rangeResults = await processPageRange({
			pdfBytes: input.pdfBytes,
			totalPages: originalPageCount,
			range,
			endpoint: input.endpoint,
			accessToken: input.accessToken,
			mimeType: input.mimeType,
			imagelessMode,
			correlationId: input.correlationId,
		})

		for (const result of rangeResults) {
			chunkSizes.push(result.byteLength)
			parsedChunks.push(result.chunk)
		}
	}

	const ocrDurationMs = Date.now() - ocrStartedAt
	const mergeStartedAt = Date.now()
	const merged = mergeOcrChunks(parsedChunks, originalPageCount)
	const mergeDurationMs = Date.now() - mergeStartedAt
	const processingTimeMs = Date.now() - input.startedAt
	const chunkCount = parsedChunks.length

	logStructured('ocr_orchestration_succeeded', {
		correlationId: input.correlationId,
		originalPageCount,
		chunkCount,
		chunkSizes,
		chunkPageRanges: parsedChunks.map(
			(chunk) => `${chunk.startPage}-${chunk.endPage}`,
		),
		ocrDurationMs,
		mergeDurationMs,
		processingTimeMs,
		characters: merged.rawText.length,
		imagelessMode,
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
			pageCount: originalPageCount,
			tableCount: merged.tables.length,
			correlationId: input.correlationId,
			originalPageCount,
			chunkCount,
			imagelessMode,
		},
		processingTimeMs,
		ocrDurationMs,
		mergeDurationMs,
		chunkSizes,
	}
}
