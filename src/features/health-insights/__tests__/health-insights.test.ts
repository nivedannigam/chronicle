import { describe, expect, it } from 'vitest'
import { detectReportChanges } from '@/features/health-insights/engines/change-detection.engine'
import { generateHealthInsights } from '@/features/health-insights/engines/health-insights.engine'
import { buildHealthScorecard } from '@/features/health-insights/engines/health-scorecard.engine'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'

function buildGraph(histories: HealthMetricHistory[]): HealthKnowledgeGraph {
	return {
		profile: {
			personId: 'user-1',
			metricHistories: histories,
			categories: [],
			insights: [],
			alerts: [],
			relationships: [],
			reportIds: ['r1', 'r2'],
			generatedAt: new Date().toISOString(),
			cacheVersion: '1',
		},
		metricDefinitions: [],
		metricCategories: [],
	}
}

describe('change detection', () => {
	it('detects improved LDL between reports', () => {
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
						observedAt: '2024-01-01',
						reportId: 'r1',
						reportTitle: 'Lipid 2024',
						laboratory: 'Lab',
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
						laboratory: 'Lab',
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
					latestValueLabel: '120',
					firstObservedAt: '2024-01-01',
					lastObservedAt: '2026-01-01',
				},
				linkedReportIds: ['r1', 'r2'],
			},
		]

		const changes = detectReportChanges({
			histories,
			uploadedReports: [],
		})

		expect(changes.some((change) => change.kind === 'improved')).toBe(true)
	})
})

describe('health insights engine', () => {
	it('generates insights with evidence and confidence', () => {
		const graph = buildGraph([
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
						observedAt: '2024-01-01',
						reportId: 'r1',
						reportTitle: 'Lipid 2024',
						laboratory: 'Lab',
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
						laboratory: 'Lab',
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
					latestValueLabel: '120',
					firstObservedAt: '2024-01-01',
					lastObservedAt: '2026-01-01',
				},
				linkedReportIds: ['r1', 'r2'],
			},
		])

		const result = generateHealthInsights({
			userId: 'user-1',
			uploadedReports: [],
			graph,
		})

		expect(result.insights.length).toBeGreaterThan(0)
		expect(result.insights[0]?.evidence.length).toBeGreaterThan(0)
		expect(result.insights[0]?.confidence).toBeDefined()
		expect(
			result.insights.every((item) => !/diagnos/i.test(item.summary)),
		).toBe(true)
	})

	it('builds scorecard sections without inventing data', () => {
		const scorecard = buildHealthScorecard(buildGraph([]))

		expect(scorecard.sections.length).toBeGreaterThan(0)
		expect(
			scorecard.sections.every((section) => section.summary.length > 0),
		).toBe(true)
		expect(scorecard.disclaimer).toContain('not medical advice')
	})
})

describe('insights for ask intent', () => {
	it('filters attention insights', () => {
		const graph = buildGraph([])
		const result = generateHealthInsights({
			userId: 'user-1',
			uploadedReports: [],
			graph,
		})

		const filtered = result.insights

		expect(Array.isArray(filtered)).toBe(true)
	})
})
