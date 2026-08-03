import { describe, expect, it } from 'vitest'
import {
	getReportPipelinePhase,
	healthReportQualifiesForMetriclessCompletion,
	isReportDisplayReady,
	isReportFullyClassified,
	isReportStuckInProcessing,
	metricsDisplayMessage,
	NO_LAB_METRICS_EXTRACTED_MESSAGE,
	reportNeedsReprocess,
	reportQualifiesForMetriclessCompletion,
	REPORT_PROCESSING_STALE_MS,
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

	it('allows metricless completion for health summary filename during processing', () => {
		expect(
			healthReportQualifiesForMetriclessCompletion({
				metadata: { reportType: 'health-summary' },
				fileName: '2023 - 2026 Health Summary.pdf',
			}),
		).toBe(true)
	})

	it('allows metricless completion for company plan wellness documents', () => {
		expect(
			healthReportQualifiesForMetriclessCompletion({
				metadata: { reportType: 'general' },
				fileName: 'Feb 2026 Company plan.pdf',
			}),
		).toBe(true)
	})

	it('detects reports stuck in processing', () => {
		const recent = createReport('processing', {
			uploaded_at: new Date().toISOString(),
		})
		const stale = createReport('processing', {
			uploaded_at: new Date(
				Date.now() - REPORT_PROCESSING_STALE_MS - 1_000,
			).toISOString(),
		})

		expect(isReportStuckInProcessing(stale)).toBe(true)
		expect(isReportStuckInProcessing(recent)).toBe(false)
	})

	it('allows metricless completion for health summary reports', () => {
		const report = createReport('completed', {
			parsed_data: {
				metrics: [],
				metadata: { reportType: 'health_summary' },
			},
		})

		expect(reportQualifiesForMetriclessCompletion(report)).toBe(true)
		expect(isReportDisplayReady(report)).toBe(true)
		expect(getReportPipelinePhase(report)).toBe('ready')
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

	it('allows metricless completion for tmt filename without metrics', () => {
		const report = createReport('completed', {
			file_name: 'Feb 2026 - TMT.pdf',
			parsed_data: {
				metrics: [],
				metadata: { reportType: 'general' },
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

	it('exports the zero-metric extraction message used by the processing pipeline', () => {
		expect(NO_LAB_METRICS_EXTRACTED_MESSAGE).toContain('OCR completed')
		expect(NO_LAB_METRICS_EXTRACTED_MESSAGE).toContain('laboratory metrics')
	})

	it('flags parsed reports with zero metrics as needing reprocess', () => {
		const report = createReport('parsed', {
			parsed_data: { metrics: [], metadata: { reportType: 'blood_test' } },
			processing_error:
				'No laboratory metrics could be extracted from this report.',
		})

		expect(reportNeedsReprocess(report)).toBe(true)
	})

	it('does not flag display-ready completed reports for reprocess', () => {
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

		expect(reportNeedsReprocess(report)).toBe(false)
	})

	it('requires all metrics classified for full classification', () => {
		const partial = createReport('completed', {
			parsed_data: {
				metrics: [
					{
						canonicalId: 'hemoglobin',
						displayName: 'Hemoglobin',
						value: 14,
						unit: 'g/dL',
						status: 'normal',
					},
					{
						canonicalId: 'unknown-1',
						displayName: 'Unknown',
						value: '—',
						unit: '',
						status: 'unknown',
					},
				],
				metadata: { reportType: 'blood_test' },
			},
		})

		expect(isReportDisplayReady(partial)).toBe(true)
		expect(isReportFullyClassified(partial)).toBe(false)
	})

	it('marks completed reports without metrics as incomplete processing', () => {
		const report = createReport('completed', {
			parsed_data: { metrics: [], metadata: { reportType: 'blood_test' } },
		})

		expect(getReportPipelinePhase(report)).toBe('processing')
		expect(reportNeedsReprocess(report)).toBe(true)
	})
})
