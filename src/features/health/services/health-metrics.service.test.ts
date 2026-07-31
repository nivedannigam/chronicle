import { describe, expect, it } from 'vitest'
import { buildHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-builder'
import { storedMetricsToUiMetrics } from '@/features/health/services/health-metrics.service'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

function createStoredMetric(
	overrides: Partial<StoredHealthMetric> = {},
): StoredHealthMetric {
	return {
		id: 'metric-1',
		user_id: 'user-1',
		family_member_id: null,
		report_id: 'report-1',
		workflow_item_id: 'workflow-1',
		canonical_metric_id: 'hemoglobin',
		display_name: 'Hemoglobin',
		raw_name: 'Hb',
		value: '13.5',
		numeric_value: 13.5,
		unit: 'g/dL',
		reference_range_raw: '12.0 - 16.0',
		reference_lower: 12,
		reference_upper: 16,
		status: 'normal',
		category: 'blood-count',
		report_date: '2024-06-01',
		observed_at: '2024-06-01T12:00:00.000Z',
		confidence: 0.9,
		source: 'text',
		created_at: '2024-06-01T12:00:00.000Z',
		...overrides,
	}
}

const uploadedReport = {
	id: 'report-1',
	user_id: 'user-1',
	file_name: 'CBC_Report.pdf',
	status: 'completed',
	uploaded_at: '2024-06-01T10:00:00.000Z',
	processed_at: '2024-06-01T11:00:00.000Z',
} as UploadedHealthReport

describe('storedMetricsToUiMetrics', () => {
	it('maps stored metrics to UI rows with unit and reference range', () => {
		const uiMetrics = storedMetricsToUiMetrics([createStoredMetric()])

		expect(uiMetrics).toEqual([
			{
				name: 'Hemoglobin',
				value: '13.5 g/dL',
				reference: '12.0 - 16.0',
				status: 'normal',
				confidence: 0.9,
			},
		])
	})

	it('maps high status to UI high status', () => {
		const uiMetrics = storedMetricsToUiMetrics([
			createStoredMetric({ status: 'high', value: '18.2' }),
		])

		expect(uiMetrics[0]?.status).toBe('high')
	})
})

describe('buildHealthKnowledgeGraph with stored metrics', () => {
	it('prefers stored metrics over parsed_data for metric histories', () => {
		const graph = buildHealthKnowledgeGraph({
			personId: 'user-1',
			uploadedReports: [uploadedReport],
			storedMetrics: [
				createStoredMetric(),
				createStoredMetric({
					id: 'metric-2',
					canonical_metric_id: 'hemoglobin',
					report_id: 'report-2',
					value: '14.1',
					numeric_value: 14.1,
					observed_at: '2024-12-01T12:00:00.000Z',
					report_date: '2024-12-01',
				}),
			],
		})

		const history = graph.profile.metricHistories.find(
			(entry) => entry.canonicalMetricId === 'hemoglobin',
		)

		expect(history?.observations).toHaveLength(2)
		expect(history?.observations[0]?.value).toBe('13.5')
		expect(history?.observations[1]?.value).toBe('14.1')
		expect(history?.trend.dataPointCount).toBe(2)
	})
})
