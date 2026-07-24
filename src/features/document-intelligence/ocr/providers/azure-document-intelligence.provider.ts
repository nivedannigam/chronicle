import type { Document } from '@/features/document-intelligence/domain'
import type { DocumentOCRProvider } from '@/features/document-intelligence/ocr/providers/document-ocr-provider.interface'
import { OcrProviderError } from '@/features/document-intelligence/ocr/types/ocr-errors.types'
import type { OcrDocumentResult } from '@/features/document-intelligence/ocr/types/ocr-result.types'

export class AzureDocumentIntelligenceProvider implements DocumentOCRProvider {
	readonly name = 'azure-document-intelligence'

	async extractText(_document: Document): Promise<OcrDocumentResult> {
		return this.extractDocument(_document)
	}

	async extractDocument(document: Document): Promise<OcrDocumentResult> {
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
