import { bytesToBase64, logStructured } from './google-auth.ts'
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
			this.errorText.includes('pages exceed the limit') ||
			this.errorText.includes('non-imageless mode')
		)
	}

	get isImagelessModeRejected(): boolean {
		return this.errorText.includes('non-imageless mode')
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

export interface DocumentAiProcessRequestPayload {
	rawDocument: {
		content: string
		mimeType: string
	}
	imagelessMode: boolean
}

export function buildDocumentAiProcessRequest(input: {
	pdfBytes: Uint8Array
	mimeType: string
	imagelessModeEnabled: boolean
}): DocumentAiProcessRequestPayload {
	return {
		rawDocument: {
			content: bytesToBase64(input.pdfBytes),
			mimeType: input.mimeType,
		},
		// REST API field per processors.process — must be camelCase `imagelessMode`.
		imagelessMode: input.imagelessModeEnabled,
	}
}

export function describeDocumentAiRequestForLog(
	payload: DocumentAiProcessRequestPayload,
	contentByteLength: number,
) {
	return {
		rawDocument: {
			mimeType: payload.rawDocument.mimeType,
			contentByteLength,
			contentBase64Length: payload.rawDocument.content.length,
		},
		imagelessMode: payload.imagelessMode,
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
	imagelessModeEnabled: boolean
	detectedPageCount: number
	providerPageLimit: number
	correlationId: string
}): Promise<Omit<ParsedOcrChunk, 'startPage' | 'endPage'>> {
	const requestBody = buildDocumentAiProcessRequest({
		pdfBytes: input.pdfBytes,
		mimeType: input.mimeType,
		imagelessModeEnabled: input.imagelessModeEnabled,
	})

	logStructured('document_ai_request', {
		correlationId: input.correlationId,
		imagelessModeEnabled: input.imagelessModeEnabled,
		detectedPageCount: input.detectedPageCount,
		providerPageLimit: input.providerPageLimit,
		requestPayload: describeDocumentAiRequestForLog(
			requestBody,
			input.pdfBytes.length,
		),
	})

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

		logStructured('document_ai_request_failed', {
			correlationId: input.correlationId,
			imagelessModeEnabled: input.imagelessModeEnabled,
			detectedPageCount: input.detectedPageCount,
			providerPageLimit: input.providerPageLimit,
			status: response.status,
			error: errorText.slice(0, 1000),
			requestHadImagelessMode: requestBody.imagelessMode === true,
		})

		throw new DocumentAiProcessError(response.status, errorText)
	}

	return parseDocumentAiResponse(await response.json())
}
