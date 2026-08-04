import { describe, expect, it } from 'vitest'
import { groupSupportingReports } from '@/features/ask/utils/supporting-reports.utils'
import type { TrustResponse } from '@/features/ask/trust/trust.types'

function sampleTrust(overrides: Partial<TrustResponse> = {}): TrustResponse {
	return {
		directAnswer: 'Sample',
		evidence: [],
		supportingReports: [],
		timelineSummary: [],
		confidence: { level: 'high', score: 0.9, factors: [] },
		missingInformation: [],
		disagreements: [],
		followUpQuestions: [],
		evidenceItems: [],
		explainabilityPrompts: [],
		...overrides,
	}
}

describe('groupSupportingReports', () => {
	it('groups metrics by report', () => {
		const groups = groupSupportingReports(
			sampleTrust({
				evidenceItems: [
					{
						id: '1',
						reportId: 'r1',
						reportTitle: 'Thyrocare Report',
						reportDate: '2026-03-01',
						metricName: 'LDL',
						metricValue: '110 mg/dL',
						claimKind: 'known_fact',
						source: 'health',
					},
					{
						id: '2',
						reportId: 'r1',
						reportTitle: 'Thyrocare Report',
						reportDate: '2026-03-01',
						metricName: 'HbA1c',
						metricValue: '5.6%',
						claimKind: 'known_fact',
						source: 'health',
					},
				],
			}),
		)

		expect(groups).toHaveLength(1)
		expect(groups[0]?.title).toBe('Thyrocare Report')
		expect(groups[0]?.metrics).toEqual(['LDL: 110 mg/dL', 'HbA1c: 5.6%'])
	})

	it('includes supportingReports without evidence items', () => {
		const groups = groupSupportingReports(
			sampleTrust({
				supportingReports: [
					{ id: 'r2', title: 'Annual Checkup', date: '2025-01-15' },
				],
			}),
		)

		expect(groups).toHaveLength(1)
		expect(groups[0]?.title).toBe('Annual Checkup')
		expect(groups[0]?.metrics).toEqual([])
	})
})
