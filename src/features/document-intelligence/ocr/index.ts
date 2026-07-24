export type {
	OcrDocumentMetadata,
	OcrDocumentResult,
	OcrExtractionResult,
	OcrPage,
	OcrTable,
	OcrTableCell,
} from '@/features/document-intelligence/ocr/types/ocr-result.types'
export { toLegacyOcrResult } from '@/features/document-intelligence/ocr/types/ocr-result.types'
export type { OcrErrorCode } from '@/features/document-intelligence/ocr/types/ocr-errors.types'
export {
	getOcrErrorMessage,
	OcrProviderError,
} from '@/features/document-intelligence/ocr/types/ocr-errors.types'
export type {
	DocumentOCRProvider,
	DocumentOCRService,
} from '@/features/document-intelligence/ocr/providers/document-ocr-provider.interface'
export {
	MockOCRProvider,
	mockOCRProvider,
	MockDocumentOCRService,
	mockDocumentOCRService,
} from '@/features/document-intelligence/ocr/providers/mock-ocr.provider'
export {
	GoogleDocumentAIProvider,
	googleDocumentAIProvider,
} from '@/features/document-intelligence/ocr/providers/google-document-ai.provider'
export {
	AzureDocumentIntelligenceProvider,
	azureDocumentIntelligenceProvider,
} from '@/features/document-intelligence/ocr/providers/azure-document-intelligence.provider'
export {
	createOCRProvider,
	defaultOCRProvider,
} from '@/features/document-intelligence/ocr/ocr-provider.factory'
export { runOcrWithRetry } from '@/features/document-intelligence/ocr/ocr-retry'
export type {
	RunOcrWithRetryOptions,
	RunOcrWithRetryResult,
} from '@/features/document-intelligence/ocr/ocr-retry'
