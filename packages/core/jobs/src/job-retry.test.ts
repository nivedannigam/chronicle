import { describe, expect, it } from 'vitest'
import {
	getRetryTargetState,
	shouldRedownload,
	shouldReprocessReport,
} from './job-retry.ts'
import { runJobBatch } from './job-worker.ts'

describe('job-retry', () => {
	it('maps failed OCR stage back to OCR', () => {
		expect(getRetryTargetState('OCR')).toBe('OCR')
		expect(getRetryTargetState('PROCESSING')).toBe('OCR')
	})

	it('maps failed download stage back to DOWNLOADING', () => {
		expect(getRetryTargetState('DOWNLOADING')).toBe('DOWNLOADING')
		expect(shouldRedownload('DOWNLOADING')).toBe(true)
	})

	it('maps indexing failures to reprocess', () => {
		expect(getRetryTargetState('INDEXING')).toBe('INDEXING')
		expect(shouldReprocessReport('INDEXING')).toBe(true)
	})
})

describe('runJobBatch', () => {
	it('runs jobs in parallel chunks', async () => {
		let concurrent = 0
		let maxConcurrent = 0

		const handler = async () => {
			concurrent += 1
			maxConcurrent = Math.max(maxConcurrent, concurrent)
			await new Promise((resolve) => setTimeout(resolve, 20))
			concurrent -= 1
			return { status: 'completed' as const, data: true }
		}

		await runJobBatch(
			Array.from({ length: 6 }, (_, index) => ({
				id: `job-${index}`,
				input: index,
				handler: async () => handler(),
			})),
			{ parallel: 3 },
		)

		expect(maxConcurrent).toBeLessThanOrEqual(3)
		expect(maxConcurrent).toBeGreaterThan(1)
	})

	it('respects cancellation between chunks', async () => {
		let cancelled = false

		const result = await runJobBatch(
			Array.from({ length: 4 }, (_, index) => ({
				id: `job-${index}`,
				input: index,
				handler: async () => ({ status: 'completed' as const }),
			})),
			{
				parallel: 2,
				isCancelled: () => cancelled,
				onBatchProgress: () => {
					cancelled = true
				},
			},
		)

		expect(result.completed).toBe(2)
		expect(result.cancelled).toBe(2)
	})
})
