import { describe, expect, it } from 'vitest'
import { dedupeMetricRows } from '@/features/health/services/health-metrics-persist.service'

describe('persistHealthMetrics dedupe', () => {
	it('keeps one row per canonical metric id', () => {
		const rows = dedupeMetricRows([
			{ canonical_metric_id: 'ldl', value: '100' },
			{ canonical_metric_id: 'ldl', value: '110' },
			{ canonical_metric_id: 'tsh', value: '2.1' },
		])

		expect(rows).toHaveLength(2)
		expect(rows.find((row) => row.canonical_metric_id === 'ldl')?.value).toBe(
			'110',
		)
	})
})
