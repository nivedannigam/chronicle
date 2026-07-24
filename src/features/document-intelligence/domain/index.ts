export type {
	HealthReport,
	ReportMetadata,
	ProcessingDebugInfo,
} from '@/features/document-intelligence/domain/health-report.domain'
export type {
	HealthMetric,
	MetricDefinition,
	MetricResult,
	MetricStatus,
	DomainMetricStatus,
	ReferenceRange,
} from '@/features/document-intelligence/domain/metric.types'
export type { Document } from '@/features/document-intelligence/domain/document.types'
export { createDocumentFromUpload } from '@/features/document-intelligence/domain/document.types'
