export { METRIC_DEFINITIONS } from '@/features/health/extraction/metric-definitions'
export {
	getMetricDefinitions,
	normalizeMetricName,
} from '@/features/health/extraction/metric-normalization.engine'
export {
	evaluateMetricStatus,
	parseReferenceRange,
} from '@/features/health/extraction/reference-range.engine'
export {
	extractMetricsFromOcr,
	toUiMetrics,
} from '@/features/health/extraction/metric-extraction.engine'
export type { MetricExtractionResult } from '@/features/health/extraction/metric-extraction.engine'
export {
	identifyReportType,
	parseReportMetadata,
} from '@/features/health/extraction/health-metadata.parser'
export type { ParsedReportMetadata } from '@/features/health/extraction/health-metadata.parser'
