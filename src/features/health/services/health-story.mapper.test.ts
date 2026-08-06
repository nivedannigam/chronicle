import { describe, expect, it } from 'vitest'
import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import type { HealthCanonicalSnapshot } from '@/features/health/types/health-context.types'
import {
	buildHealthStoryParagraphs,
	buildHealthStoryViewModel,
	buildSinceLastVisitItems,
	buildStoryRecommendations,
} from '@/features/health/services/health-story.mapper'

const testSnapshot: HealthCanonicalSnapshot = {
	score: 82,
	overallStatus: 'Good',
	overallSummary: "You're doing well — most markers are in a healthy range.",
	trendLabel: 'Stable',
	latestReportTitle: 'Annual Checkup',
	latestReportDate: 'Mar 1, 2026',
	latestVisitTitle: 'Annual Health Checkup',
	latestVisitDate: 'Mar 1, 2026',
	topRecommendationTitle: null,
	topRecommendationPath: null,
}

function makeCompanion(
	overrides: Partial<HealthCompanionView> = {},
): HealthCompanionView {
	return {
		status: 'Looking Good',
		statusDetail: '',
		score: 82,
		scoreReasons: [],
		attention: [],
		changes: [],
		nextSteps: [],
		recentReports: [],
		journeyEvents: [],
		metricGroups: [],
		trendSeries: [],
		trendHighlights: [],
		insightGroups: [],
		narrative: [],
		profile: {
			personId: 'p1',
			generatedAt: new Date().toISOString(),
			reportCount: 3,
			metrics: [],
			priorityMetrics: [],
			otherMetrics: [],
		},
		healthSummary: {
			headline: 'Stable',
			bullets: [],
			overallStatus: 'stable',
			metricsNeedingAttention: 0,
			improvingCount: 1,
			stableCount: 2,
			newFindingsCount: 0,
		},
		coverage: null,
		...overrides,
	}
}

describe('health-story.mapper', () => {
	it('uses early-story copy for a single report', () => {
		const paragraphs = buildHealthStoryParagraphs(makeCompanion(), 1)

		expect(paragraphs[0]).toContain('just getting to know your health')
	})

	it('builds a narrative story for multiple reports', () => {
		const paragraphs = buildHealthStoryParagraphs(
			makeCompanion({
				changes: [
					{
						id: 'c1',
						label: 'LDL',
						direction: 'improved',
					},
					{
						id: 'c2',
						label: 'Vitamin D',
						direction: 'worsened',
					},
				],
				profile: {
					personId: 'p1',
					generatedAt: new Date().toISOString(),
					reportCount: 4,
					metrics: [],
					priorityMetrics: [
						{
							canonicalId: 'vitamin-d',
							displayName: 'Vitamin D',
							categoryId: 'vitamin',
							latestValue: '18',
							unit: 'ng/mL',
							status: 'low',
							trend: 'declining',
							trendLabel: 'Low',
							observationCount: 2,
							firstObservedAt: '2025-01-01',
							lastObservedAt: '2026-01-01',
							historyYears: [2025, 2026],
						},
					],
					otherMetrics: [],
				},
			}),
			4,
		)

		expect(paragraphs.join(' ')).toContain('stable')
		expect(paragraphs.join(' ')).toContain('LDL improved')
	})

	it('limits since-last-visit items to three', () => {
		const companion = makeCompanion({
			changes: [
				{ id: '1', label: 'LDL', direction: 'improved' },
				{ id: '2', label: 'HbA1c', direction: 'stable' },
				{ id: '3', label: 'Vitamin D', direction: 'worsened' },
				{ id: '4', label: 'TSH', direction: 'stable' },
			],
		})

		expect(buildSinceLastVisitItems(companion, []).length).toBeLessThanOrEqual(
			3,
		)
	})

	it('avoids duplicate recommendation titles', () => {
		const recommendations = buildStoryRecommendations(
			makeCompanion({
				nextSteps: [
					{
						id: 'a',
						title: 'Discuss vitamin d with your doctor',
						reason: 'Low levels',
					},
					{
						id: 'b',
						title: 'Discuss vitamin d with your doctor',
						reason: 'Still low',
					},
				],
			}),
			['Vitamin D has been consistently low.'],
		)

		expect(recommendations).toHaveLength(1)
	})

	it('builds a complete home story view model', () => {
		const story = buildHealthStoryViewModel({
			companion: makeCompanion(),
			memberName: 'Nivedan',
			hasReports: true,
			reportCount: 3,
			visits: [
				{
					id: 'v1',
					title: 'Annual Health Checkup',
					displayMonthYear: 'March 2026',
					date: '2026-03-01',
				} as never,
			],
			snapshot: testSnapshot,
		})

		expect(story.greeting).toContain('Nivedan')
		expect(story.journeyVisits).toHaveLength(1)
	})
})
