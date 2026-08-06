import { describe, expect, it } from 'vitest'
import { isHealthImportInFlight } from '@/features/health/services/health-import-inflight.service'
import type { UploadedHealthReport } from '@/features/health/types'

describe('health-import-inflight.service', () => {
	it('detects in-flight import statuses', () => {
		expect(
			isHealthImportInFlight([
				{ status: 'completed' } as UploadedHealthReport,
				{ status: 'processing' } as UploadedHealthReport,
			]),
		).toBe(true)
	})

	it('returns false when all reports are terminal', () => {
		expect(
			isHealthImportInFlight([
				{ status: 'completed' } as UploadedHealthReport,
				{ status: 'failed' } as UploadedHealthReport,
			]),
		).toBe(false)
	})
})
