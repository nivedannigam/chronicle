import { describe, expect, it } from 'vitest'
import {
	buildReportFindingLabels,
	buildReportHealthImpact,
} from '@/features/health/services/health-report-impact.service'
import type { HealthVisitSnapshot } from '@/features/health-knowledge/services/health-snapshot.service'

function snapshot(
	overrides: Partial<HealthVisitSnapshot> = {},
): HealthVisitSnapshot {
	return {
		reportId: 'report-1',
		visitDate: '2026-03-09',
		healthScore: 72,
		majorMetrics: [],
		importantFindings: [],
		...overrides,
	} as HealthVisitSnapshot
}

describe('buildReportHealthImpact', () => {
	it('summarizes abnormal metrics in consumer language', () => {
		const result = buildReportHealthImpact(
			snapshot({
				majorMetrics: [
					{
						canonicalMetricId: 'ldl',
						displayName: 'LDL',
						value: '145 mg/dL',
						status: 'high',
					},
				],
			}),
		)

		expect(result).toContain('LDL is above range')
		expect(result).toContain('worth discussing with your doctor')
	})

	it('returns null when snapshot is missing', () => {
		expect(buildReportHealthImpact(undefined)).toBeNull()
	})
})

describe('buildReportFindingLabels', () => {
	it('softens clinical status words', () => {
		const labels = buildReportFindingLabels(
			snapshot({
				importantFindings: ['LDL is low', 'Glucose is high'],
			}),
		)

		expect(labels[0]).toContain('below range')
		expect(labels[1]).toContain('above range')
	})
})
