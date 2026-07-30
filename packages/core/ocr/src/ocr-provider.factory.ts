import type { EdgeFunctionInvoker } from '@chronicle/core-storage'
import {
	documentProcessingConfig,
	type OcrProviderType,
} from './config/document-processing.config'
import { ocrStorageConfig } from './config/ocr-storage.config'
import type { DocumentOCRProvider } from './providers/document-ocr-provider.interface'
import { AzureDocumentIntelligenceProvider } from './providers/azure-document-intelligence.provider'
import { GoogleDocumentAIProvider } from './providers/google-document-ai.provider'
import { MockOCRProvider } from './providers/mock-ocr.provider'

export interface OcrProviderFactoryOptions {
	storageBucket?: string
	invokeEdgeFunction?: EdgeFunctionInvoker
}

export function createOCRProvider(
	providerType: OcrProviderType = documentProcessingConfig.ocrProvider,
	options: OcrProviderFactoryOptions = {},
): DocumentOCRProvider {
	switch (providerType) {
		case 'mock':
			return new MockOCRProvider()
		case 'google':
			if (!options.invokeEdgeFunction) {
				throw new Error(
					'Google OCR requires invokeEdgeFunction in createOCRProvider options.',
				)
			}

			return new GoogleDocumentAIProvider({
				storageBucket: options.storageBucket ?? ocrStorageConfig.bucket,
				invokeEdgeFunction: options.invokeEdgeFunction,
			})
		case 'azure':
			return new AzureDocumentIntelligenceProvider()
		default:
			return new MockOCRProvider()
	}
}
