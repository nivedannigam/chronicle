import { describe, expect, it } from 'vitest'
import { buildHealthCompanionSuggestions } from '@/features/ask/services/health-companion-suggestions.service'

describe('health-companion-suggestions.service', () => {
	it('suggests contextual health questions when reports exist', () => {
		const suggestions = buildHealthCompanionSuggestions({
			reportCount: 3,
			healthKnowledge: {
				latestReport: {
					id: 'r1',
					title: 'Annual Checkup',
					date: '2026-03-01',
				},
				previousReports: [{ id: 'r2' }, { id: 'r3' }],
				abnormalMetrics: [{ displayName: 'Vitamin D' }],
				metrics: [{ displayName: 'Vitamin D' }],
			} as never,
		})

		expect(suggestions.some((item) => item.label.includes('Compare'))).toBe(
			true,
		)
		expect(suggestions.some((item) => item.label.includes('doctor'))).toBe(true)
	})

	it('avoids repeating recent questions', () => {
		const suggestions = buildHealthCompanionSuggestions({
			reportCount: 2,
			healthKnowledge: {
				latestReport: { id: 'r1', title: 'Checkup', date: '2026-03-01' },
				previousReports: [],
				abnormalMetrics: [],
				metrics: [],
			} as never,
			recentQuestions: ['How am I doing overall based on my health reports?'],
		})

		expect(
			suggestions.some((item) =>
				item.question.includes('How am I doing overall'),
			),
		).toBe(false)
	})
})
