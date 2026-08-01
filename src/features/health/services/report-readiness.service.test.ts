import { describe, expect, it } from 'vitest'
import {
	getReportPipelinePhase,
	isReportDisplayReady,
	metricsDisplayMessage,
	reportQualifiesForMetriclessCompletion,
} from '@/features/health/services/report-readiness.service'
import type { UploadedHealthReport } from '@/features/health/types'

function createReport(
	status: UploadedHealthReport['status'],
	overrides: Partial<UploadedHealthReport> = {},
): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: 'user-1',
		file_name: 'CBC.pdf',
		status,
		uploaded_at: '2024-06-01T10:00:00.000Z',
		...overrides,
	} as UploadedHealthReport
}

describe('report-readiness.service', () => {
	it('treats completed reports with metrics as display-ready', () => {
		const report = createReport('completed', {
			parsed_data: {
				metrics: [
					{
						canonicalId: 'hemoglobin',
						displayName: 'Hemoglobin',
						value: 14,
						unit: 'g/dL',
						status: 'normal',
					},
				],
				metadata: { reportType: 'blood_test' },
			},
		})

		expect(isReportDisplayReady(report)).toBe(true)
		expect(getReportPipelinePhase(report)).toBe('ready')
	})

	it('does not treat completed reports without metrics as display-ready', () => {
		const report = createReport('completed', {
			parsed_data: {
				metrics: [],
				metadata: { reportType: 'health_summary' },
			},
		})

		expect(isReportDisplayReady(report)).toBe(false)
		expect(getReportPipelinePhase(report)).toBe('processing')
	})

	it('allows metricless completion for ecg reports', () => {
		const report = createReport('completed', {
			file_name: 'ECG-report.pdf',
			parsed_data: {
				metrics: [],
				metadata: { reportType: 'ECG' },
			},
		})

		expect(reportQualifiesForMetriclessCompletion(report)).toBe(true)
		expect(isReportDisplayReady(report)).toBe(true)
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
