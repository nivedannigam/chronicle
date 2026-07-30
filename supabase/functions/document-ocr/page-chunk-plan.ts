export interface PageChunkRange {
	startPage: number
	endPage: number
	pageCount: number
}

export interface ParsedOcrChunk {
	rawText: string
	pageCount: number
	confidence: number
	tables: Array<{
		pageNumber: number
		rows: number
		columns: number
		cells: Array<{
			row: number
			column: number
			text: string
			confidence?: number
		}>
	}>
	startPage: number
	endPage: number
}

export interface MergedOcrResult {
	rawText: string
	pages: Array<{
		pageNumber: number
		text: string
		confidence: number
	}>
	tables: ParsedOcrChunk['tables']
	confidence: number
}

/** Plan contiguous page ranges for provider limits (1-based inclusive pages). */
export function planPageChunks(
	totalPages: number,
	maxPagesPerChunk: number,
): PageChunkRange[] {
	if (totalPages <= 0) {
		return []
	}

	const chunkSize = Math.max(1, maxPagesPerChunk)
	const chunks: PageChunkRange[] = []

	for (let startPage = 1; startPage <= totalPages; startPage += chunkSize) {
		const endPage = Math.min(startPage + chunkSize - 1, totalPages)

		chunks.push({
			startPage,
			endPage,
			pageCount: endPage - startPage + 1,
		})
	}

	return chunks
}

export function splitPageRange(
	startPage: number,
	endPage: number,
): [PageChunkRange, PageChunkRange] {
	const pageCount = endPage - startPage + 1

	if (pageCount <= 1) {
		throw new Error('Cannot split a single-page range further.')
	}

	const firstCount = Math.ceil(pageCount / 2)
	const splitEnd = startPage + firstCount - 1

	return [
		{
			startPage,
			endPage: splitEnd,
			pageCount: firstCount,
		},
		{
			startPage: splitEnd + 1,
			endPage,
			pageCount: endPage - splitEnd,
		},
	]
}

/** Merge chunk OCR output into one logical document response. */
export function mergeOcrChunks(
	chunks: ParsedOcrChunk[],
	totalPages: number,
): MergedOcrResult {
	if (chunks.length === 0) {
		return {
			rawText: '',
			pages: [],
			tables: [],
			confidence: 0,
		}
	}

	const rawText = chunks
		.map((chunk) => chunk.rawText.trim())
		.filter(Boolean)
		.join('\n')

	const confidence =
		chunks.reduce((sum, chunk) => sum + chunk.confidence, 0) / chunks.length

	const tables = chunks.flatMap((chunk) =>
		chunk.tables.map((table) => ({
			...table,
			pageNumber: table.pageNumber + chunk.startPage - 1,
		})),
	)

	const pages = Array.from({ length: totalPages }, (_, index) => ({
		pageNumber: index + 1,
		text: rawText,
		confidence,
	}))

	return {
		rawText,
		pages,
		tables,
		confidence,
	}
}

export function readMaxPagesPerChunk(imagelessMode: boolean): number {
	const configured = Deno.env.get('GOOGLE_DOCUMENT_AI_MAX_PAGES')

	if (configured) {
		const parsed = Number.parseInt(configured, 10)

		if (Number.isFinite(parsed) && parsed > 0) {
			return parsed
		}
	}

	return imagelessMode ? 30 : 15
}

export function readImagelessModeEnabled(): boolean {
	const configured = Deno.env.get('GOOGLE_DOCUMENT_AI_IMAGELESS_MODE')

	if (configured === 'false' || configured === '0') {
		return false
	}

	return true
}
