import { bytesToBase64 } from './google-auth.ts'
import { buildPageSelector } from './page-chunk-plan.ts'
import type { ParsedOcrChunk } from './page-chunk-plan.ts'

export class DocumentAiProcessError extends Error {
	constructor(
		readonly status: number,
		readonly errorText: string,
	) {
		super(`Google Document AI failed (${status}): ${errorText}`)
		this.name = 'DocumentAiProcessError'
	}

	get isPageLimitExceeded(): boolean {
		return (
			this.errorText.includes('PAGE_LIMIT_EXCEEDED') ||
			this.errorText.includes('pages exceed the limit')
		)
	}
}

interface DocumentAiPage {
	pageNumber?: number
	tables?: Array<{
		headerRows?: number
		bodyRows?: number
	}>
}

interface DocumentAiResponse {
	document?: {
		text?: string
		pages?: DocumentAiPage[]
	}
}

function parseDocumentAiResponse(
	payload: DocumentAiResponse,
): Omit<ParsedOcrChunk, 'startPage' | 'endPage'> {
	const document = payload.document
	const rawText = document?.text ?? ''
	const pageEntries = document?.pages ?? []
	const pageCount = pageEntries.length
	const confidence = 0.95

	const tables = pageEntries.flatMap((page, index) => {
		const pageNumber = page.pageNumber ?? index + 1
		const pageTables = page.tables ?? []

		return pageTables.map((table) => ({
			pageNumber,
			rows: (table.headerRows ?? 0) + (table.bodyRows ?? 0),
			columns: 0,
			cells: [],
		}))
	})

	return {
		rawText,
		pageCount,
		confidence,
		tables,
	}
}

export async function processDocumentAiChunk(input: {
	endpoint: string
	accessToken: string
	pdfBytes: Uint8Array
	mimeType: string
	imagelessMode: boolean
	pageRange?: {
		startPage: number
		endPage: number
	}
}): Promise<Omit<ParsedOcrChunk, 'startPage' | 'endPage'>> {
	const requestBody: Record<string, unknown> = {
		rawDocument: {
			content: bytesToBase64(input.pdfBytes),
			mimeType: input.mimeType,
		},
		imagelessMode: input.imagelessMode,
	}

	if (input.pageRange) {
		requestBody.processOptions = {
			individualPageSelector: {
				pages: buildPageSelector(
					input.pageRange.startPage,
					input.pageRange.endPage,
				),
			},
		}
	}

	const response = await fetch(input.endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${input.accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new DocumentAiProcessError(response.status, errorText)
	}

	return parseDocumentAiResponse(await response.json())
}
