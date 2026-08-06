import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
	getInFlightHealthReportProcessing,
	isHealthReportProcessingLocked,
	withHealthReportProcessingLock,
} from '@/features/health/services/health-report-processing-lock.service'

describe('health-report-processing-lock.service', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	it('deduplicates concurrent non-force runs', async () => {
		let runs = 0

		const first = withHealthReportProcessingLock(
			'report-1',
			async () => {
				runs += 1
				await new Promise((resolve) => setTimeout(resolve, 50))
				return { id: 'report-1' } as never
			},
			{},
		)

		const second = withHealthReportProcessingLock(
			'report-1',
			async () => {
				runs += 1
				return { id: 'report-1' } as never
			},
			{},
		)

		await vi.advanceTimersByTimeAsync(50)
		await Promise.all([first, second])

		expect(runs).toBe(1)
		expect(isHealthReportProcessingLocked('report-1')).toBe(false)
		expect(getInFlightHealthReportProcessing('report-1')).toBeUndefined()
	})
})
