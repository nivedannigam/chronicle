export type { OcrDocumentInput } from './types/ocr-document-input.types'
export type {
	OcrDocumentMetadata,
	OcrDocumentResult,
	OcrExtractionResult,
	OcrPage,
	OcrTable,
	OcrTableCell,
} from './types/ocr-result.types'
export { toLegacyOcrResult } from './types/ocr-result.types'
export type { OcrErrorCode } from './types/ocr-errors.types'
export { getOcrErrorMessage, OcrProviderError } from './types/ocr-errors.types'
export type {
	DocumentOCRProvider,
	DocumentOCRService,
} from './providers/document-ocr-provider.interface'
export {
	MockOCRProvider,
	mockOCRProvider,
	MockDocumentOCRService,
	mockDocumentOCRService,
} from './providers/mock-ocr.provider'
export {
	buildMockOcrDocumentResult,
	MOCK_LAB_TEMPLATES,
	type MockLabMetricRow,
	type MockLabTemplate,
} from './providers/mock-ocr.templates'
export {
	GoogleDocumentAIProvider,
	OCR_SETUP_MESSAGE,
	type GoogleDocumentAiProviderOptions,
} from './providers/google-document-ai.provider'
export {
	AzureDocumentIntelligenceProvider,
	azureDocumentIntelligenceProvider,
} from './providers/azure-document-intelligence.provider'
export {
	createOCRProvider,
	type OcrProviderFactoryOptions,
} from './ocr-provider.factory'
export { runOcrWithRetry } from './ocr-retry'
export type { RunOcrWithRetryOptions, RunOcrWithRetryResult } from './ocr-retry'
export {
	documentProcessingConfig,
	isProductionOcrProvider,
	type OcrProviderType,
} from './config/document-processing.config'
export { ocrStorageConfig } from './config/ocr-storage.config'
