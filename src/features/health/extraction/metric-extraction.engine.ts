import type {
	HealthMetric,
	MetricResult,
	MetricStatus,
} from '@/features/health/domain/metric.types'
import type { OcrDocumentResult } from '@/features/document-intelligence/ocr'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import {
	evaluateMetricStatus,
	evaluateQualitativeMetricStatus,
	formatReferenceRange,
	isQualitativeNormalValue,
	isQualitativeReference,
	normalizeQualitativeToken,
	parseNumericValue,
	parseReferenceRange,
} from '@/features/health/extraction/reference-range.engine'
import {
	extractMetricsFromLayouts,
	formatLayoutExtractionSummary,
} from '@/features/health/extraction/layouts/layout-extractor.registry'
import type { RawMetricRow } from '@/features/health/extraction/layouts/layout-extractor.types'

export type { RawMetricRow } from '@/features/health/extraction/layouts/layout-extractor.types'

const METHOD_LIKE_VALUE =
	/^(?:Microscopy|Visual Determination|pH indicator|pKa change|PEI|GOD-POD|Nitroprusside|Diazo coupling|Hays sulphur|Ehrlich reaction|Peroxidase reaction|Esterase reaction)$/i

function evaluateExtractedMetricStatus(
	value: string,
	referenceRange: ReturnType<typeof parseReferenceRange>,
	numericValue: number | null,
): MetricStatus {
	if (numericValue != null) {
		return evaluateMetricStatus(numericValue, referenceRange, value)
	}

	const qualitative = evaluateQualitativeMetricStatus(value, referenceRange)

	if (qualitative) {
		return qualitative
	}

	const normalized = normalizeQualitativeToken(value)

	if (isQualitativeNormalValue(normalized)) {
		return 'normal'
	}

	if (
		METHOD_LIKE_VALUE.test(value.trim()) &&
		isQualitativeReference(referenceRange.rawText) &&
		isQualitativeNormalValue(normalizeQualitativeToken(referenceRange.rawText))
	) {
		return 'normal'
	}

	if (['POSITIVE', 'REACTIVE', 'PRESENT'].includes(normalized)) {
		return 'high'
	}

	return 'unknown'
}

function toMetricResult(row: RawMetricRow): MetricResult {
	const { canonicalId, displayName } = normalizeMetricName(row.rawName)
	const referenceRange = parseReferenceRange(row.referenceRange, row.unit)
	const numericValue = parseNumericValue(row.value)
	let resolvedValue = row.value

	if (
		METHOD_LIKE_VALUE.test(resolvedValue.trim()) &&
		isQualitativeReference(referenceRange.rawText)
	) {
		resolvedValue = normalizeQualitativeToken(referenceRange.rawText)
	}

	const status = evaluateExtractedMetricStatus(
		resolvedValue,
		referenceRange,
		numericValue,
	)

	return {
		rawName: row.rawName,
		canonicalId,
		displayName,
		value: resolvedValue,
		numericValue,
		unit: row.unit,
		referenceRange,
		status,
		confidence: row.confidence,
		source: row.source,
	}
}

function toHealthMetric(result: MetricResult, index: number): HealthMetric {
	return {
		id: `metric-${index + 1}`,
		canonicalId: result.canonicalId ?? `unknown-${index + 1}`,
		displayName: result.displayName,
		rawName: result.rawName,
		value: result.value,
		numericValue: result.numericValue,
		unit: result.unit,
		referenceRange: result.referenceRange,
		status: result.status,
		confidence: result.confidence,
	}
}

export interface MetricExtractionResult {
	metrics: HealthMetric[]
	metricResults: MetricResult[]
	warnings: string[]
	normalizationMap: Array<{ raw: string; canonical: string }>
}

export function extractMetricsFromOcr(
	ocrDocument: OcrDocumentResult,
): MetricExtractionResult {
	const warnings: string[] = []
	const { rows, strategiesUsed } = extractMetricsFromLayouts({
		rawText: ocrDocument.rawText,
		tables: ocrDocument.tables,
		fileName: ocrDocument.metadata?.fileName,
	})

	warnings.push(formatLayoutExtractionSummary(rows, strategiesUsed))

	if (ocrDocument.tables.length > 1) {
		warnings.push(
			`Processed ${ocrDocument.tables.length} OCR tables and merged duplicate metrics.`,
		)
	}

	const unknownCount = rows.filter(
		(row) => !normalizeMetricName(row.rawName).canonicalId,
	).length

	if (unknownCount > 0) {
		warnings.push(
			`${unknownCount} metric(s) could not be normalized to a known definition.`,
		)
	}

	const missingValues = rows.filter((row) => !row.value.trim()).length

	if (missingValues > 0) {
		warnings.push(
			`${missingValues} metric row(s) had missing values and were skipped.`,
		)
	}

	const validRows = rows.filter((row) => row.value.trim())
	const metricResults = validRows.map(toMetricResult)
	const metrics = metricResults.map(toHealthMetric)
	const normalizationMap = metricResults.map((result) => ({
		raw: result.rawName,
		canonical: result.displayName,
	}))

	return {
		metrics,
		metricResults,
		warnings,
		normalizationMap,
	}
}

export function mapMetricStatusToUi(
	status: MetricStatus,
): import('@/features/health/types').MetricStatus {
	switch (status) {
		case 'high':
		case 'borderline':
			return 'high'
		case 'low':
			return 'low'
		case 'critical':
			return 'critical'
		default:
			return 'normal'
	}
}

export function toUiMetrics(
	metrics: HealthMetric[],
): import('@/features/health/types').HealthMetric[] {
	return metrics.map((metric) => ({
		name: metric.displayName,
		value: metric.unit ? `${metric.value} ${metric.unit}` : metric.value,
		reference: formatReferenceRange(metric.referenceRange),
		status: mapMetricStatusToUi(metric.status),
		confidence: metric.confidence,
	}))
}
