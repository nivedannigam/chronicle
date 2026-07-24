export type {
	Document,
	DomainMetricStatus,
	HealthMetric,
	HealthReport,
	MetricDefinition,
	MetricResult,
	MetricStatus,
	ReferenceRange,
	ReportMetadata,
	ProcessingDebugInfo,
} from '@/features/document-intelligence/domain'
export { createDocumentFromUpload } from '@/features/document-intelligence/domain'
export type {
	DocumentOCRProvider,
	DocumentOCRService,
	OcrDocumentMetadata,
	OcrDocumentResult,
	OcrErrorCode,
	OcrExtractionResult,
	OcrPage,
	OcrTable,
} from '@/features/document-intelligence/ocr'
export {
	AzureDocumentIntelligenceProvider,
	createOCRProvider,
	defaultOCRProvider,
	getOcrErrorMessage,
	GoogleDocumentAIProvider,
	MockOCRProvider,
	mockOCRProvider,
	OcrProviderError,
	runOcrWithRetry,
} from '@/features/document-intelligence/ocr'
export type {
	HealthReportParser,
	HealthReportParserInput,
} from '@/features/document-intelligence/parsers'
export {
	HealthReportParserImpl,
	healthReportParser,
	MockHealthReportParser,
	mockHealthReportParser,
} from '@/features/document-intelligence/parsers'
export {
	extractMetricsFromOcr,
	normalizeMetricName,
	parseReportMetadata,
	toUiMetrics,
} from '@/features/document-intelligence/extraction'
export type {
	DocumentIntelligencePipelineDeps,
	DocumentPipelineOutcome,
	DocumentPipelineProgress,
	DocumentPipelineStage,
	PipelineProgressCallback,
	RunDocumentIntelligencePipelineInput,
} from '@/features/document-intelligence/pipeline'
export {
	defaultDocumentIntelligencePipelineDeps,
	runDocumentIntelligencePipeline,
} from '@/features/document-intelligence/pipeline'
