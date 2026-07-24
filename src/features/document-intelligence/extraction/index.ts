export { METRIC_DEFINITIONS } from '@/features/document-intelligence/extraction/metric-definitions'
export {
	findMetricDefinition,
	normalizeMetricName,
	getMetricDefinitions,
} from '@/features/document-intelligence/extraction/metric-normalization.engine'
export {
	parseReferenceRange,
	parseNumericValue,
	evaluateMetricStatus,
	formatReferenceRange,
} from '@/features/document-intelligence/extraction/reference-range.engine'
export {
	extractMetricsFromOcr,
	mapMetricStatusToUi,
	toUiMetrics,
} from '@/features/document-intelligence/extraction/metric-extraction.engine'
export type { MetricExtractionResult } from '@/features/document-intelligence/extraction/metric-extraction.engine'
export { parseReportMetadata } from '@/features/document-intelligence/extraction/health-metadata.parser'
export type { ParsedReportMetadata } from '@/features/document-intelligence/extraction/health-metadata.parser'
