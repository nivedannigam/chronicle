import { describe, expect, it } from 'vitest'
import {
	consumerDomainStatus,
	relativeConsumerUpdatedLabel,
} from '@/features/health/services/health-consumer-status.service'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'

function history(
	overrides: Partial<HealthMetricHistory> = {},
): HealthMetricHistory {
	return {
		canonicalMetricId: 'creatinine',
		displayName: 'Creatinine',
		categoryId: 'kidney',
		unit: 'mg/dL',
		linkedReportIds: ['report-1'],
		observations: [
			{
				id: 'obs-1',
				canonicalMetricId: 'creatinine',
				displayName: 'Creatinine',
				rawName: 'Creatinine',
				value: '0.9',
				numericValue: 0.9,
				unit: 'mg/dL',
				status: 'unknown',
				confidence: 0.8,
				observedAt: '2026-03-09T12:00:00.000Z',
				reportId: 'report-1',
				reportTitle: 'Full Body Checkup',
				laboratory: 'Thyrocare',
				referenceRange: '',
			},
		],
		trend: {
			direction: 'stable',
			changePercent: 0,
			dataPointCount: 1,
			description: 'Stable',
		},
		baseline: {
			latest: 0.9,
			best: 0.9,
			worst: 0.9,
			average: 0.9,
			highest: 0.9,
			lowest: 0.9,
			firstRecorded: 0.9,
			lastRecorded: 0.9,
			latestValueLabel: '0.9 mg/dL',
			firstObservedAt: '2026-03-09T12:00:00.000Z',
			lastObservedAt: '2026-03-09T12:00:00.000Z',
		},
		...overrides,
	}
}

describe('relativeConsumerUpdatedLabel', () => {
	it('shows month and year instead of vague relative time', () => {
		expect(relativeConsumerUpdatedLabel('2026-03-09T12:00:00.000Z')).toBe(
			'Updated Mar 2026',
		)
	})
})

describe('consumerDomainStatus', () => {
	it('does not hide domains that have unclassified metrics', () => {
		expect(consumerDomainStatus([history()])).toBe('Monitor')
	})

	it('returns no recent data only when the domain is empty', () => {
		expect(consumerDomainStatus([])).toBe('No Recent Data')
	})
})
