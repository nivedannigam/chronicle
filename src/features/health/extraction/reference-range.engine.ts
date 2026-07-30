import type {
	MetricStatus,
	ReferenceRange,
} from '@/features/health/domain/metric.types'

const BORDERLINE_MARGIN = 0.1

export function parseReferenceRange(
	rawText: string,
	unit: string | null,
): ReferenceRange {
	const trimmed = rawText.trim()

	if (!trimmed) {
		return {
			lowerLimit: null,
			upperLimit: null,
			unit,
			rawText: trimmed,
		}
	}

	if (trimmed.startsWith('<')) {
		const upperLimit = Number.parseFloat(trimmed.slice(1))

		return {
			lowerLimit: null,
			upperLimit: Number.isNaN(upperLimit) ? null : upperLimit,
			unit,
			rawText: trimmed,
		}
	}

	if (trimmed.startsWith('>')) {
		const lowerLimit = Number.parseFloat(trimmed.slice(1))

		return {
			lowerLimit: Number.isNaN(lowerLimit) ? null : lowerLimit,
			upperLimit: null,
			unit,
			rawText: trimmed,
		}
	}

	const rangeMatch = trimmed.match(/([\d.]+)\s*-\s*([\d.]+)/)

	if (rangeMatch) {
		return {
			lowerLimit: Number.parseFloat(rangeMatch[1]),
			upperLimit: Number.parseFloat(rangeMatch[2]),
			unit,
			rawText: trimmed,
		}
	}

	return {
		lowerLimit: null,
		upperLimit: null,
		unit,
		rawText: trimmed,
	}
}

export function parseNumericValue(value: string): number | null {
	const cleaned = value.replace(/[^\d.-]/g, '')
	const parsed = Number.parseFloat(cleaned)

	return Number.isNaN(parsed) ? null : parsed
}

export function evaluateMetricStatus(
	numericValue: number | null,
	referenceRange: ReferenceRange,
): MetricStatus {
	if (numericValue == null) {
		return 'unknown'
	}

	const { lowerLimit, upperLimit, rawText } = referenceRange

	if (rawText.startsWith('<') && upperLimit != null) {
		if (numericValue >= upperLimit * (1 + BORDERLINE_MARGIN)) {
			return 'high'
		}

		if (numericValue >= upperLimit) {
			return 'borderline'
		}

		return 'normal'
	}

	if (rawText.startsWith('>') && lowerLimit != null) {
		if (numericValue <= lowerLimit * (1 - BORDERLINE_MARGIN)) {
			return 'low'
		}

		if (numericValue <= lowerLimit) {
			return 'borderline'
		}

		return 'normal'
	}

	if (lowerLimit != null && upperLimit != null) {
		if (numericValue < lowerLimit * (1 - BORDERLINE_MARGIN)) {
			return 'critical'
		}

		if (numericValue < lowerLimit) {
			return 'low'
		}

		if (numericValue > upperLimit * (1 + BORDERLINE_MARGIN)) {
			return 'critical'
		}

		if (numericValue > upperLimit) {
			return 'high'
		}

		const span = upperLimit - lowerLimit

		if (span > 0) {
			const distanceToLow = numericValue - lowerLimit
			const distanceToHigh = upperLimit - numericValue

			if (
				distanceToLow <= span * BORDERLINE_MARGIN ||
				distanceToHigh <= span * BORDERLINE_MARGIN
			) {
				return 'borderline'
			}
		}

		return 'normal'
	}

	return 'unknown'
}

export function formatReferenceRange(referenceRange: ReferenceRange): string {
	return referenceRange.rawText || '—'
}
