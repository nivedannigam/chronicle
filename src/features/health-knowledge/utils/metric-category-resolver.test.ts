import { describe, expect, it } from 'vitest'
import {
	isUrineMicroscopyMetric,
	resolveMetricCategoryId,
} from '@/features/health-knowledge/utils/metric-category-resolver'

describe('metric-category-resolver', () => {
	it('maps bacteria and casts to urine, not blood', () => {
		expect(
			resolveMetricCategoryId({
				canonicalId: 'raw:bacteria',
				displayName: 'BACTERIA',
			}),
		).toBe('urine')

		expect(
			isUrineMicroscopyMetric({
				canonicalId: 'raw:casts',
				displayName: 'CASTS',
			}),
		).toBe(true)
	})
})
