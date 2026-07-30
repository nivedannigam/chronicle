import type { OcrDocumentInput } from '../types/ocr-document-input.types'
import type { DocumentOCRProvider } from './document-ocr-provider.interface'
import { OcrProviderError } from '../types/ocr-errors.types'
import type { OcrDocumentResult } from '../types/ocr-result.types'

export class AzureDocumentIntelligenceProvider implements DocumentOCRProvider {
	readonly name = 'azure-document-intelligence'

	async extractText(_document: OcrDocumentInput): Promise<OcrDocumentResult> {
		return this.extractDocument(_document)
	}

	async extractDocument(
		document: OcrDocumentInput,
	): Promise<OcrDocumentResult> {
		void document
		throw new OcrProviderError(
			'Azure Document Intelligence is not configured. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and API key before enabling this provider.',
			'provider_not_configured',
			false,
		)
	}

	getConfidence(result: OcrDocumentResult): number {
		return result.confidence
	}
}

export const azureDocumentIntelligenceProvider =
	new AzureDocumentIntelligenceProvider()
