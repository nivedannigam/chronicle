import { describe, expect, it } from 'vitest'
import {
	normalizeExtractMetricsModelMetric,
	normalizeExtractMetricsModelMetrics,
} from '@/shared/ai/prompt/extract-metrics-normalizer'

describe('extract-metrics-normalizer', () => {
	it('normalizes alternate Gemini metric field names', () => {
		const metric = normalizeExtractMetricsModelMetric({
			name: 'Total Cholesterol',
			result: 167,
			unit: 'mg/dl',
			referenceRange: '0-200',
			status: 'normal',
		})

		expect(metric).toEqual({
			rawName: 'Total Cholesterol',
			displayName: 'Total Cholesterol',
			value: '167',
			unit: 'mg/dl',
			referenceRange: {
				rawText: '0-200',
				lowerLimit: null,
				upperLimit: null,
				unit: null,
			},
			status: 'normal',
		})
	})

	it('drops metrics without a name or value', () => {
		expect(
			normalizeExtractMetricsModelMetrics([
				{ rawName: 'HbA1c' },
				{ value: '6.1' },
				{ rawName: 'HbA1c', value: '6.1' },
			]),
		).toHaveLength(1)
	})
})
