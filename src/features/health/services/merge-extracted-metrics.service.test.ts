import { describe, expect, it } from 'vitest'
import type { HealthMetric } from '@/features/health/domain/metric.types'
import { mergeExtractedHealthMetrics } from '@/features/health/services/merge-extracted-metrics.service'

function metric(
	canonicalId: string,
	value: string,
	source: 'layout' | 'ai',
): HealthMetric {
	return {
		id: canonicalId,
		canonicalId,
		displayName: canonicalId,
		rawName: canonicalId,
		value,
		numericValue: Number.parseFloat(value),
		unit: null,
		referenceRange: {
			rawText: '',
			lowerLimit: null,
			upperLimit: null,
			unit: null,
		},
		status: 'normal',
		confidence: source === 'ai' ? 0.55 : 0.9,
	}
}

describe('mergeExtractedHealthMetrics', () => {
	it('prefers AI metrics when canonical IDs overlap', () => {
		const merged = mergeExtractedHealthMetrics({
			layoutMetrics: [metric('creatinine', '1.0', 'layout')],
			aiMetrics: [metric('creatinine', '0.9', 'ai')],
		})

		expect(merged).toHaveLength(1)
		expect(merged[0]?.value).toBe('0.9')
	})

	it('keeps unique metrics from both sources', () => {
		const merged = mergeExtractedHealthMetrics({
			layoutMetrics: [metric('creatinine', '1.0', 'layout')],
			aiMetrics: [metric('tsh', '2.1', 'ai')],
		})

		expect(merged).toHaveLength(2)
		expect(merged.map((item) => item.canonicalId).sort()).toEqual([
			'creatinine',
			'tsh',
		])
	})
})
