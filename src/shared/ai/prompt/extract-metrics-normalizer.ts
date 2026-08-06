import type { ExtractMetricsAiEdgeMetric } from '@/shared/ai/transport/extract-metrics.types'

function readString(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim()
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value)
	}

	return ''
}

function readNullableString(value: unknown): string | null {
	const text = readString(value)
	return text.length > 0 ? text : null
}

function readNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value.replace(/,/g, ''))
		return Number.isFinite(parsed) ? parsed : null
	}

	return null
}

function normalizeReferenceRange(
	raw: unknown,
): ExtractMetricsAiEdgeMetric['referenceRange'] {
	if (typeof raw === 'string') {
		return {
			rawText: raw.trim(),
			lowerLimit: null,
			upperLimit: null,
			unit: null,
		}
	}

	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return {
			rawText: '',
			lowerLimit: null,
			upperLimit: null,
			unit: null,
		}
	}

	const record = raw as Record<string, unknown>

	return {
		rawText: readString(record.rawText ?? record.text ?? record.range),
		lowerLimit: readNumber(record.lowerLimit ?? record.min),
		upperLimit: readNumber(record.upperLimit ?? record.max),
		unit: readNullableString(record.unit),
	}
}

export function normalizeExtractMetricsModelMetric(
	raw: unknown,
): ExtractMetricsAiEdgeMetric | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return null
	}

	const record = raw as Record<string, unknown>
	const rawName = readString(
		record.rawName ?? record.name ?? record.testName ?? record.metric,
	)
	const value = readString(record.value ?? record.result ?? record.reading)

	if (!rawName || !value) {
		return null
	}

	const displayName = readString(record.displayName ?? record.label) || rawName

	return {
		rawName,
		displayName,
		value,
		unit: readNullableString(record.unit),
		referenceRange: normalizeReferenceRange(record.referenceRange),
		status: readString(record.status) || 'unknown',
	}
}

export function normalizeExtractMetricsModelMetrics(
	rawMetrics: unknown,
): ExtractMetricsAiEdgeMetric[] {
	if (!Array.isArray(rawMetrics)) {
		return []
	}

	return rawMetrics
		.map((item) => normalizeExtractMetricsModelMetric(item))
		.filter((item): item is ExtractMetricsAiEdgeMetric => item != null)
}
