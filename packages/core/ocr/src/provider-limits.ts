export interface OcrProviderLimits {
	standardPages: number
	imagelessPages: number
}

export const GOOGLE_DOCUMENT_AI_LIMITS: OcrProviderLimits = {
	standardPages: 15,
	imagelessPages: 30,
}

export const AZURE_DOCUMENT_INTELLIGENCE_LIMITS: OcrProviderLimits = {
	standardPages: 2000,
	imagelessPages: 2000,
}

export function resolveProviderPageLimit(
	limits: OcrProviderLimits,
	imagelessMode: boolean,
): number {
	return imagelessMode ? limits.imagelessPages : limits.standardPages
}

export interface PageChunkRange {
	startPage: number
	endPage: number
	pageCount: number
}

/** Plan contiguous 1-based inclusive page ranges for provider OCR limits. */
export function planOcrPageChunks(
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

export function buildPageSelector(
	startPage: number,
	endPage: number,
): number[] {
	return Array.from(
		{ length: endPage - startPage + 1 },
		(_, index) => startPage + index,
	)
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

const PAGE_LIMIT_PATTERN =
	/PAGE_LIMIT_EXCEEDED|pages exceed the limit|page limit exceeded/i

export function isPageLimitExceededError(message: string): boolean {
	return PAGE_LIMIT_PATTERN.test(message)
}

export function formatOcrUserMessage(
	message: string,
	pageCount?: number,
): string {
	if (isPageLimitExceededError(message)) {
		const pagesMatch =
			message.match(/got\s+(\d+)/i) ??
			message.match(/(\d+)\s+pages/i) ??
			message.match(/pages[^\d]*(\d+)/i)
		const pages = pageCount ?? pagesMatch?.[1] ?? 'many'

		return `This report contains ${pages} pages. Chronicle is processing it in multiple OCR batches.`
	}

	if (/Google Document AI failed/i.test(message)) {
		return message.replace(/^Google Document AI failed \(\d+\):\s*/i, '')
	}

	return message
}
