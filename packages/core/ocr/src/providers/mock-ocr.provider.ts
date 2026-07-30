import type { OcrDocumentInput } from '../types/ocr-document-input.types'
import type { DocumentOCRProvider } from './document-ocr-provider.interface'
import { buildMockOcrDocumentResult } from './mock-ocr.templates'
import type { OcrDocumentResult } from '../types/ocr-result.types'

export class MockOCRProvider implements DocumentOCRProvider {
	readonly name = 'mock'

	async extractText(document: OcrDocumentInput): Promise<OcrDocumentResult> {
		await delay(120)

		return buildMockOcrDocumentResult(document, { includeTables: false })
	}

	async extractDocument(
		document: OcrDocumentInput,
	): Promise<OcrDocumentResult> {
		await delay(180)

		return buildMockOcrDocumentResult(document, { includeTables: true })
	}

	getConfidence(result: OcrDocumentResult): number {
		if (result.pages.length === 0) {
			return result.confidence
		}

		const pageAverage =
			result.pages.reduce((sum, page) => sum + page.confidence, 0) /
			result.pages.length

		return Math.min(result.confidence, pageAverage)
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

export const mockOCRProvider = new MockOCRProvider()

/** @deprecated Use MockOCRProvider instead */
export const MockDocumentOCRService = MockOCRProvider
/** @deprecated Use mockOCRProvider instead */
export const mockDocumentOCRService = mockOCRProvider
