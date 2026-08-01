import type {
	HealthMetric,
	MetricResult,
	MetricStatus,
} from '@/features/health/domain/metric.types'
import type {
	OcrDocumentResult,
	OcrTable,
} from '@/features/document-intelligence/ocr'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import {
	evaluateMetricStatus,
	formatReferenceRange,
	parseNumericValue,
	parseReferenceRange,
} from '@/features/health/extraction/reference-range.engine'
import { isThyrocareOcrText } from '@/features/health/extraction/vendors/thyrocare-detection'
import { extractThyrocareMetricsFromText } from '@/features/health/extraction/vendors/thyrocare-text.extractor'

export type RawMetricRow = {
	rawName: string
	value: string
	referenceRange: string
	unit: string | null
	confidence: number
	source: 'table' | 'text'
}

const METRIC_ROW_PATTERN =
	/^([A-Za-z0-9 ()/.%-]+?)\s{2,}(\S+)\s{2,}([\d.<>-]+(?:\s*-\s*[\d.]+)?)\s{2,}(.+)$/gm

function getTableCell(
	table: OcrTable,
	row: number,
	column: number,
): string | null {
	const cell = table.cells.find(
		(item) => item.row === row && item.column === column,
	)

	return cell?.text?.trim() ?? null
}

function extractRowsFromTables(tables: OcrTable[]): RawMetricRow[] {
	const rows: RawMetricRow[] = []

	for (const table of tables) {
		for (let row = 1; row < table.rows; row += 1) {
			const rawName = getTableCell(table, row, 0)
			const value = getTableCell(table, row, 1)
			const referenceRange = getTableCell(table, row, 2) ?? ''
			const unit = getTableCell(table, row, 3)

			if (!rawName || !value) {
				continue
			}

			const cellConfidence = table.cells
				.filter((cell) => cell.row === row)
				.map((cell) => cell.confidence ?? 0.95)
			const confidence =
				cellConfidence.length > 0
					? cellConfidence.reduce((sum, item) => sum + item, 0) /
						cellConfidence.length
					: 0.95

			rows.push({
				rawName,
				value,
				referenceRange,
				unit,
				confidence,
				source: 'table',
			})
		}
	}

	return rows
}

function extractRowsFromText(text: string): RawMetricRow[] {
	const rows: RawMetricRow[] = []

	for (const match of text.matchAll(METRIC_ROW_PATTERN)) {
		const [, rawName, value, referenceRange, unit] = match

		rows.push({
			rawName: rawName.trim(),
			value: value.trim(),
			referenceRange: referenceRange.trim(),
			unit: unit.trim(),
			confidence: 0.88,
			source: 'text',
		})
	}

	return rows
}

function deduplicateRows(rows: RawMetricRow[]): RawMetricRow[] {
	const bestByKey = new Map<string, RawMetricRow>()

	for (const row of rows) {
		const { canonicalId } = normalizeMetricName(row.rawName)
		const key =
			canonicalId ?? normalizeMetricName(row.rawName).displayName.toLowerCase()
		const existing = bestByKey.get(key)

		if (!existing || row.confidence > existing.confidence) {
			bestByKey.set(key, row)
		}
	}

	return [...bestByKey.values()]
}

function evaluateExtractedMetricStatus(
	value: string,
	referenceRange: ReturnType<typeof parseReferenceRange>,
	numericValue: number | null,
): MetricStatus {
	if (numericValue != null) {
		return evaluateMetricStatus(numericValue, referenceRange)
	}

	const normalized = value.trim().toUpperCase()

	if (
		[
			'NEGATIVE',
			'NON REACTIVE',
			'NONREACTIVE',
			'ABSENT',
			'NORMAL',
			'CLEAR',
		].includes(normalized)
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
	const status = evaluateExtractedMetricStatus(
		row.value,
		referenceRange,
		numericValue,
	)

	return {
		rawName: row.rawName,
		canonicalId,
		displayName,
		value: row.value,
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
	const thyrocareRows = isThyrocareOcrText(ocrDocument.rawText)
		? extractThyrocareMetricsFromText(ocrDocument.rawText)
		: []
	const fromTables = extractRowsFromTables(ocrDocument.tables)
	const fromText =
		fromTables.length > 0 || thyrocareRows.length > 0
			? []
			: extractRowsFromText(ocrDocument.rawText)

	if (
		fromTables.length === 0 &&
		fromText.length === 0 &&
		thyrocareRows.length === 0
	) {
		warnings.push('No metric rows identified in OCR output.')
	}

	if (thyrocareRows.length > 0) {
		warnings.push(
			`Extracted ${thyrocareRows.length} metric row(s) using Thyrocare parser.`,
		)
	}

	if (ocrDocument.tables.length > 1) {
		warnings.push(
			`Processed ${ocrDocument.tables.length} OCR tables and merged duplicate metrics.`,
		)
	}

	const merged = deduplicateRows([...thyrocareRows, ...fromTables, ...fromText])
	const unknownCount = merged.filter(
		(row) => !normalizeMetricName(row.rawName).canonicalId,
	).length

	if (unknownCount > 0) {
		warnings.push(
			`${unknownCount} metric(s) could not be normalized to a known definition.`,
		)
	}

	const missingValues = merged.filter((row) => !row.value.trim()).length

	if (missingValues > 0) {
		warnings.push(
			`${missingValues} metric row(s) had missing values and were skipped.`,
		)
	}

	const validRows = merged.filter((row) => row.value.trim())
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
