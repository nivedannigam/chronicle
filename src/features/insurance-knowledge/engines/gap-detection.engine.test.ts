import { describe, expect, it } from 'vitest'
import { detectCoverageGaps } from '@/features/insurance-knowledge/engines/gap-detection.engine'
import type { CategorySnapshot } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

describe('detectCoverageGaps', () => {
	it('does not flag a gap when policies exist but are not active yet', () => {
		const categories: CategorySnapshot[] = [
			{
				categoryId: 'health',
				name: 'Health Insurance',
				emoji: '🏥',
				color: '#000',
				policyCount: 2,
				activePolicyCount: 0,
				totalSumInsured: null,
				currency: 'INR',
				latestRenewalDate: null,
				statusLabel: 'No active policy',
				lastUpdated: '—',
			},
		]

		const gaps = detectCoverageGaps({
			categories,
			policyHistories: [],
		})

		expect(gaps.some((gap) => gap.categoryId === 'health')).toBe(false)
	})
})
