import { describe, expect, it } from 'vitest'
import {
	compareRankedItems,
	rankingAxisPriority,
	recencyScore,
	sortByEvidenceRanking,
} from '@/shared/ai/evidence-planning/evidence-ranker'

describe('evidence-ranker', () => {
	it('prioritizes recency for STATUS_OVERVIEW', () => {
		const priority = rankingAxisPriority('STATUS_OVERVIEW')
		expect(priority.recency).toBeGreaterThan(priority.importance)
	})

	it('prioritizes relevance for FACT_LOOKUP', () => {
		const priority = rankingAxisPriority('FACT_LOOKUP')
		expect(priority.relevance).toBeGreaterThan(priority.recency)
	})

	it('sorts newer observations ahead when recency dominates', () => {
		const items = sortByEvidenceRanking(
			[
				{
					id: 'old',
					relevance: 0.8,
					recency: recencyScore('2024-01-01'),
					importance: 0.95,
					trend: 0,
				},
				{
					id: 'new',
					relevance: 0.8,
					recency: recencyScore('2026-03-01'),
					importance: 0.4,
					trend: 0,
				},
			],
			'STATUS_OVERVIEW',
		)

		expect(items[0]?.id).toBe('new')
	})

	it('sorts by relevance first for FACT_LOOKUP', () => {
		const priority = rankingAxisPriority('FACT_LOOKUP')
		const delta = compareRankedItems(
			{
				id: 'a',
				relevance: 0.95,
				recency: 0.1,
				importance: 0.1,
				trend: 0,
			},
			{
				id: 'b',
				relevance: 0.2,
				recency: 0.99,
				importance: 0.99,
				trend: 0,
			},
			priority,
		)

		expect(delta).toBeLessThan(0)
	})
})
