import { describe, expect, it } from 'vitest'
import type { HealthCanonicalSnapshot } from '@/features/health/types/health-context.types'
import { buildHealthProgressViewModel } from '@/features/health/services/health-progress.mapper'
import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'

function companion(
	overrides: Partial<HealthCompanionView> = {},
): HealthCompanionView {
	return {
		status: 'Improving',
		statusDetail: '2 areas trending better',
		score: 84,
		scoreReasons: [],
		attention: [],
		changes: [
			{
				id: 'change-1',
				label: 'Triglycerides improved',
				direction: 'improved',
			},
		],
		nextSteps: [],
		recentReports: [],
		journeyEvents: [
			{
				id: 'event-1',
				date: '2026-03-09',
				displayDate: 'Mar 9, 2026',
				title: 'Annual Checkup',
				summary: 'Latest full body report',
				kind: 'checkup',
			},
		],
		metricGroups: [],
		trendSeries: [],
		trendHighlights: [],
		insightGroups: [],
		narrative: [
			'Your overall health has improved steadily over the last year.',
		],
		profile: null,
		healthSummary: null,
		...overrides,
	}
}

function graph(): HealthKnowledgeGraph {
	return {
		profile: {
			personId: 'user-1',
			metricHistories: [
				{
					canonicalMetricId: 'ldl',
					displayName: 'LDL Cholesterol',
					categoryId: 'heart',
					unit: 'mg/dL',
					linkedReportIds: ['report-1', 'report-2'],
					observations: [
						{
							id: 'obs-1',
							canonicalMetricId: 'ldl',
							displayName: 'LDL Cholesterol',
							rawName: 'LDL',
							value: '120',
							unit: 'mg/dL',
							status: 'high',
							confidence: 0.9,
							numericValue: 120,
							observedAt: '2024-06-01T00:00:00.000Z',
							reportId: 'report-1',
							reportTitle: 'Cardiac Profile',
							laboratory: 'Thyrocare',
							referenceRange: '< 100',
						},
						{
							id: 'obs-2',
							canonicalMetricId: 'ldl',
							displayName: 'LDL Cholesterol',
							rawName: 'LDL',
							value: '95',
							unit: 'mg/dL',
							status: 'normal',
							confidence: 0.9,
							numericValue: 95,
							observedAt: '2026-03-09T00:00:00.000Z',
							reportId: 'report-2',
							reportTitle: 'Full Body Checkup',
							laboratory: 'Thyrocare',
							referenceRange: '< 100',
						},
					],
					trend: {
						direction: 'improving',
						changePercent: -20,
						dataPointCount: 2,
						description: 'Improving',
					},
					baseline: {
						latest: 95,
						best: 95,
						worst: 120,
						average: 107.5,
						highest: 120,
						lowest: 95,
						firstRecorded: 120,
						lastRecorded: 95,
						latestValueLabel: '95 mg/dL',
						firstObservedAt: '2024-06-01T00:00:00.000Z',
						lastObservedAt: '2026-03-09T00:00:00.000Z',
					},
				},
			],
			categories: [],
			insights: [],
			alerts: [],
			relationships: [],
			reportIds: ['report-1', 'report-2'],
			generatedAt: '2026-03-09T00:00:00.000Z',
			cacheVersion: '1',
		},
		metricDefinitions: [],
		metricCategories: [],
	}
}

describe('buildHealthProgressViewModel', () => {
	it('builds overall progress with score trend and improvements', () => {
		const snapshot: HealthCanonicalSnapshot = {
			score: 84,
			overallStatus: 'Good',
			overallSummary:
				"You're doing well — most markers are in a healthy range.",
			trendLabel: 'Improving',
			latestReportTitle: 'Annual Checkup',
			latestReportDate: 'Mar 9, 2026',
			latestVisitTitle: 'Annual Checkup',
			latestVisitDate: 'Mar 9, 2026',
			topRecommendationTitle: null,
			topRecommendationPath: null,
		}

		const view = buildHealthProgressViewModel({
			companion: companion(),
			graph: graph(),
			snapshot,
		})

		expect(view.overall.score).toBe(84)
		expect(view.overall.summary).toContain('doing well')
		expect(view.overall.statusLabel).toBe('Good')
		expect(
			view.improvements.some((item) => item.label.includes('Triglycerides')),
		).toBe(true)
		expect(view.domains.some((domain) => domain.name === 'Heart')).toBe(true)
		expect(view.milestones[0]?.title).toBe('Annual Checkup')
	})
})
