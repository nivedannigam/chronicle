import { describe, expect, it } from 'vitest'
import { deriveCategoryCoverageStatus } from '@/features/insurance/services/insurance-consumer-status.service'

describe('deriveCategoryCoverageStatus', () => {
	it('shows Partial when a policy exists but is not active', () => {
		expect(
			deriveCategoryCoverageStatus({
				activePolicyCount: 0,
				policyCount: 1,
				totalSumInsured: null,
				categoryId: 'health',
				hasGap: false,
			}),
		).toBe('Partial')
	})

	it('shows Missing only when no policies exist', () => {
		expect(
			deriveCategoryCoverageStatus({
				activePolicyCount: 0,
				policyCount: 0,
				totalSumInsured: null,
				categoryId: 'health',
				hasGap: true,
			}),
		).toBe('Missing')
	})
})
