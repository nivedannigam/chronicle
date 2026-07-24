import {
	documentProcessingConfig,
	type OcrProviderType,
} from '@/config/document-processing'
import type { DocumentOCRProvider } from '@/features/document-intelligence/ocr/providers/document-ocr-provider.interface'
import { AzureDocumentIntelligenceProvider } from '@/features/document-intelligence/ocr/providers/azure-document-intelligence.provider'
import { GoogleDocumentAIProvider } from '@/features/document-intelligence/ocr/providers/google-document-ai.provider'

export function createOCRProvider(
	providerType: OcrProviderType = documentProcessingConfig.ocrProvider,
): DocumentOCRProvider {
	switch (providerType) {
		case 'google':
			return new GoogleDocumentAIProvider()
		case 'azure':
			return new AzureDocumentIntelligenceProvider()
		default:
			return new GoogleDocumentAIProvider()
	}
}

export const defaultOCRProvider = createOCRProvider()
