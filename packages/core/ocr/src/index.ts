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
export {
	AZURE_DOCUMENT_INTELLIGENCE_LIMITS,
	buildPageSelector,
	formatOcrUserMessage,
	GOOGLE_DOCUMENT_AI_LIMITS,
	isPageLimitExceededError,
	planOcrPageChunks,
	resolveProviderPageLimit,
	splitPageRange,
	type OcrProviderLimits,
	type PageChunkRange,
} from './provider-limits.ts'
export {
	formatOcrProviderLabel,
	formatOcrRuntimeError,
	isOcrConfigurationError,
	resolveOcrProviderStatus,
	type OcrConfigurationStatus,
	type OcrProcessingEvent,
	type OcrProviderStatusSnapshot,
} from './ocr-status.ts'
export { ocrStorageConfig } from './config/ocr-storage.config'
export {
	HEALTH_REPORT_SUPPORTED_FORMATS_LABEL,
	HEALTH_REPORT_SUPPORTED_MIME_TYPES,
	formatStorageMimeRejectionError,
	formatUnsupportedHealthReportMimeError,
	inferHealthReportMimeType,
	isImageMimeType,
	isPdfMimeType,
	isSupportedHealthReportMimeType,
	normalizeHealthReportMimeType,
	resolveHealthReportMimeType,
	type HealthReportMimeType,
} from './supported-mime-types.ts'
