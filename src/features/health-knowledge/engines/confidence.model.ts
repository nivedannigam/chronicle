import type {
	HealthKnowledgeConfidence,
	HealthKnowledgeMetric,
	HealthKnowledgeReportRef,
	MetricDataSource,
	MetricValidationStatus,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

const LIPID_IDS = new Set([
	'ldl',
	'hdl',
	'total-cholesterol',
	'triglycerides',
	'vldl',
])

const DIABETES_IDS = new Set([
	'hba1c',
	'fasting-glucose',
	'random-glucose',
	'pp-glucose',
])

const THYROID_IDS = new Set(['tsh', 't3', 't4', 'free-t3', 'free-t4'])

export function mapMetricSource(raw: string | undefined): MetricDataSource {
	switch (raw?.toLowerCase()) {
		case 'llm':
		case 'ai':
			return 'llm'
		case 'manual':
		case 'user':
			return 'manual'
		default:
			return 'parser'
	}
}

export function deriveValidationStatus(input: {
	status: string
	confidence: number
	source: MetricDataSource
}): MetricValidationStatus {
	if (input.status === 'unknown') {
		return input.confidence >= 0.5 ? 'partial' : 'unvalidated'
	}

	if (input.source === 'manual') {
		return 'validated'
	}

	if (input.confidence >= 0.85) {
		return 'validated'
	}

	if (input.confidence >= 0.55) {
		return 'partial'
	}

	return 'unvalidated'
}

export function buildKnowledgeConfidence(input: {
	metrics: HealthKnowledgeMetric[]
	reports: HealthKnowledgeReportRef[]
	displayReadyCount: number
}): HealthKnowledgeConfidence {
	const reportCount = input.reports.length
	const classifiedMetrics = input.metrics.filter(
		(metric) => metric.status !== 'unknown',
	)
	const metricCoverage =
		reportCount === 0
			? 0
			: classifiedMetrics.length / Math.max(reportCount * 20, 1)

	const parserConfidences = input.reports
		.map((report) => report.parserConfidence)
		.filter((value): value is number => value != null)

	const parserConfidence =
		parserConfidences.length > 0
			? parserConfidences.reduce((sum, value) => sum + value, 0) /
				parserConfidences.length
			: null

	const displayReadyRatio =
		reportCount === 0 ? 0 : input.displayReadyCount / reportCount

	const avgMetricConfidence =
		classifiedMetrics.length > 0
			? classifiedMetrics.reduce((sum, metric) => sum + metric.confidence, 0) /
				classifiedMetrics.length
			: 0

	const dataCompleteness = clamp01(
		displayReadyRatio * 0.4 +
			clamp01(metricCoverage) * 0.4 +
			avgMetricConfidence * 0.2,
	)

	const overall = clamp01(
		dataCompleteness * 0.5 +
			(avgMetricConfidence || 0) * 0.3 +
			(parserConfidence ?? avgMetricConfidence) * 0.2,
	)

	return {
		overall: round2(overall),
		dataCompleteness: round2(dataCompleteness),
		parserConfidence:
			parserConfidence != null ? round2(parserConfidence) : null,
		metricCoverage: round2(clamp01(metricCoverage)),
		reportCount,
		displayReadyCount: input.displayReadyCount,
	}
}

export function detectMissingPanels(metrics: Array<{ canonicalId: string }>): {
	missingLipid: boolean
	missingDiabetes: boolean
	missingThyroid: boolean
} {
	const ids = new Set(metrics.map((metric) => metric.canonicalId))

	return {
		missingLipid: ![...LIPID_IDS].some((id) => ids.has(id)),
		missingDiabetes: ![...DIABETES_IDS].some((id) => ids.has(id)),
		missingThyroid: ![...THYROID_IDS].some((id) => ids.has(id)),
	}
}

export function extractReportConfidences(report: UploadedHealthReport): {
	parserConfidence: number | null
	ocrConfidence: number | null
} {
	const parsed = report.parsed_data as Record<string, unknown> | null
	const metadata =
		parsed && typeof parsed === 'object' && 'metadata' in parsed
			? (parsed.metadata as Record<string, unknown>)
			: null

	const parserConfidence =
		typeof metadata?.parserConfidence === 'number'
			? metadata.parserConfidence
			: typeof metadata?.confidence === 'number'
				? metadata.confidence
				: null

	const ocrConfidence =
		typeof report.ocr_confidence === 'number'
			? report.ocr_confidence
			: typeof metadata?.ocrConfidence === 'number'
				? metadata.ocrConfidence
				: null

	return { parserConfidence, ocrConfidence }
}

export function metricFromStored(stored: StoredHealthMetric): {
	source: MetricDataSource
	confidence: number
	validationStatus: MetricValidationStatus
} {
	const source = mapMetricSource(stored.source)
	const confidence = stored.confidence

	return {
		source,
		confidence,
		validationStatus: deriveValidationStatus({
			status: stored.status,
			confidence,
			source,
		}),
	}
}

export function deriveMetricConfidence(input: {
	status: string
	confidence: number
	source: MetricDataSource
}): {
	source: MetricDataSource
	confidence: number
	validationStatus: MetricValidationStatus
} {
	return {
		source: input.source,
		confidence: input.confidence,
		validationStatus: deriveValidationStatus(input),
	}
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

function round2(value: number): number {
	return Math.round(value * 100) / 100
}
