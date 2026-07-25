import { describe, expect, it } from 'vitest'
import { resolveMetric } from '@/features/semantic-memory/entity-resolution/entity-resolver'
import { buildSemanticInsights } from '@/features/semantic-memory/insights/semantic-insights.engine'
import {
	buildMetricHistoryRecords,
	buildYearTimeline,
} from '@/features/semantic-memory/timeline/timeline-engine'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'

describe('entity resolution', () => {
	it('maps SGPT and ALT to the same canonical metric', () => {
		const sgpt = resolveMetric('SGPT')
		const alt = resolveMetric('ALT')
		const full = resolveMetric('Alanine Aminotransferase')

		expect(sgpt.canonicalId).toBe('alt')
		expect(alt.canonicalId).toBe('alt')
		expect(full.canonicalId).toBe('alt')
	})

	it('maps glycated hemoglobin to HbA1c', () => {
		const result = resolveMetric('Glycated Hemoglobin')

		expect(result.canonicalId).toBe('hba1c')
		expect(result.displayName).toBe('HbA1c')
	})
})

describe('metric history records', () => {
	it('captures latest, previous, trend and range values', () => {
		const histories: HealthMetricHistory[] = [
			{
				canonicalMetricId: 'ldl',
				displayName: 'LDL',
				categoryId: 'heart',
				unit: 'mg/dL',
				observations: [
					{
						id: 'o1',
						canonicalMetricId: 'ldl',
						displayName: 'LDL',
						rawName: 'LDL',
						value: '160',
						numericValue: 160,
						unit: 'mg/dL',
						status: 'high',
						confidence: 0.9,
						observedAt: '2024-06-01',
						reportId: 'r1',
						reportTitle: 'Lipid 2024',
						laboratory: 'Lab A',
						referenceRange: '<100',
					},
					{
						id: 'o2',
						canonicalMetricId: 'ldl',
						displayName: 'LDL',
						rawName: 'LDL',
						value: '120',
						numericValue: 120,
						unit: 'mg/dL',
						status: 'normal',
						confidence: 0.9,
						observedAt: '2026-01-01',
						reportId: 'r2',
						reportTitle: 'Lipid 2026',
						laboratory: 'Lab A',
						referenceRange: '<100',
					},
				],
				trend: {
					direction: 'improving',
					changePercent: -0.25,
					dataPointCount: 2,
					description: 'Improving',
				},
				baseline: {
					latest: 120,
					best: 120,
					worst: 160,
					average: 140,
					highest: 160,
					lowest: 120,
					firstRecorded: 160,
					lastRecorded: 120,
					latestValueLabel: '120 mg/dL',
					firstObservedAt: '2024-06-01',
					lastObservedAt: '2026-01-01',
				},
				linkedReportIds: ['r1', 'r2'],
			},
		]

		const records = buildMetricHistoryRecords(histories)

		expect(records[0]?.latestValue).toBe('120')
		expect(records[0]?.previousValue).toBe('160')
		expect(records[0]?.trendDirection).toBe('improving')
		expect(records[0]?.highest).toBe('160')
		expect(records[0]?.lowest).toBe('120')
	})
})

describe('timeline engine', () => {
	it('creates resolution events when abnormalities normalize', () => {
		const histories: HealthMetricHistory[] = [
			{
				canonicalMetricId: 'alt',
				displayName: 'ALT (SGPT)',
				categoryId: 'liver',
				unit: 'U/L',
				observations: [
					{
						id: 'o1',
						canonicalMetricId: 'alt',
						displayName: 'ALT (SGPT)',
						rawName: 'ALT',
						value: '80',
						numericValue: 80,
						unit: 'U/L',
						status: 'high',
						confidence: 0.9,
						observedAt: '2024-03-01',
						reportId: 'r1',
						reportTitle: 'LFT 2024',
						laboratory: 'Lab A',
						referenceRange: '<40',
					},
					{
						id: 'o2',
						canonicalMetricId: 'alt',
						displayName: 'ALT (SGPT)',
						rawName: 'ALT',
						value: '35',
						numericValue: 35,
						unit: 'U/L',
						status: 'normal',
						confidence: 0.9,
						observedAt: '2026-02-01',
						reportId: 'r2',
						reportTitle: 'LFT 2026',
						laboratory: 'Lab A',
						referenceRange: '<40',
					},
				],
				trend: {
					direction: 'improving',
					changePercent: -0.4,
					dataPointCount: 2,
					description: 'Improving',
				},
				baseline: {
					latest: 35,
					best: 35,
					worst: 80,
					average: 57.5,
					highest: 80,
					lowest: 35,
					firstRecorded: 80,
					lastRecorded: 35,
					latestValueLabel: '35 U/L',
					firstObservedAt: '2024-03-01',
					lastObservedAt: '2026-02-01',
				},
				linkedReportIds: ['r1', 'r2'],
			},
		]

		const timeline = buildYearTimeline(histories)
		const labels = timeline.flatMap((group) =>
			group.events.map((event) => event.label),
		)

		expect(labels.some((label) => /normalized/i.test(label))).toBe(true)
	})
})

describe('semantic insights', () => {
	it('detects resolved abnormalities without diagnosing', () => {
		const insights = buildSemanticInsights({
			histories: [],
			metricHistories: [
				{
					canonicalId: 'alt',
					displayName: 'ALT (SGPT)',
					categoryId: 'liver',
					unit: 'U/L',
					latestValue: '35',
					previousValue: '80',
					trend: 'Improving',
					trendDirection: 'improving',
					highest: '80',
					lowest: '35',
					average: '57.5',
					latestStatus: 'normal',
					previousStatus: 'high',
					latestObservedAt: '2026-02-01',
					previousObservedAt: '2024-03-01',
					dataPointCount: 2,
					changePercent: '-40%',
					linkedReportIds: ['r1', 'r2'],
				},
			],
			abnormalReportCount: 0,
		})

		expect(
			insights.some((insight) => insight.kind === 'resolved_abnormality'),
		).toBe(true)
		expect(insights.every((insight) => !/diagnos/i.test(insight.text))).toBe(
			true,
		)
	})
})
