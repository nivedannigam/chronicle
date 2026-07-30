import type {
	HealthMetric,
	MetricResult,
} from '@/features/health/domain/metric.types'

export interface ReportMetadata {
	reportType: string
	laboratory: string
	reportDate: string | null
	collectionDate: string | null
	referenceNumber: string | null
	patientName: string | null
	doctorName: string | null
	testNames: string[]
	sourceDocumentId: string
	parserVersion: string
	ocrConfidence: number
	pageCount: number
	ocrProvider: string
	ocrProcessingTimeMs: number
}

export interface ProcessingDebugInfo {
	ocrProvider: string
	ocrProcessingTimeMs: number
	ocrConfidence: number
	pageCount: number
	tableCount: number
	parsedFields: Record<string, string | null>
	normalizationMap: Array<{ raw: string; canonical: string }>
	extractedMetricCount: number
	warnings: string[]
}

export interface HealthReport {
	id: string
	documentId: string
	metadata: ReportMetadata
	metrics: HealthMetric[]
	metricResults: MetricResult[]
	extractedText: string
	createdAt: string
	debug?: ProcessingDebugInfo
}

/** @deprecated Use MetricResult from metric.types */
export type { MetricResult }
/** @deprecated Use domain HealthMetric */
export type { HealthMetric }
export type DomainMetricStatus =
	import('@/features/document-intelligence/domain/metric.types').MetricStatus
