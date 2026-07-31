import { describe, expect, it } from 'vitest'
import {
	getReportPipelinePhase,
	isReportDisplayReady,
	metricsDisplayMessage,
} from '@/features/health/services/report-readiness.service'
import type { UploadedHealthReport } from '@/features/health/types'

function createReport(
	status: UploadedHealthReport['status'],
): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: 'user-1',
		file_name: 'CBC.pdf',
		status,
		uploaded_at: '2024-06-01T10:00:00.000Z',
	} as UploadedHealthReport
}

describe('report-readiness.service', () => {
	it('treats completed reports as display-ready', () => {
		expect(isReportDisplayReady(createReport('completed'))).toBe(true)
		expect(getReportPipelinePhase(createReport('completed'))).toBe('ready')
	})

	it('treats parsed reports as still processing', () => {
		expect(getReportPipelinePhase(createReport('parsed'))).toBe('processing')
	})

	it('shows processing message while pipeline is in flight', () => {
		expect(
			metricsDisplayMessage({
				report: createReport('processing'),
				storedMetricCount: 0,
			}),
		).toBe('Metrics are still being processed.')
	})

	it('shows empty-lab message for completed reports without metrics', () => {
		expect(
			metricsDisplayMessage({
				report: createReport('completed'),
				storedMetricCount: 0,
			}),
		).toBe('No laboratory metrics detected.')
	})
})
