import { describe, expect, it } from 'vitest'
import { buildHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-builder'
import { mergeHealthObservations } from '@/features/health-knowledge/services/merge-health-observations'
import { computeHealthScoreFromHistories } from '@/features/health-knowledge/services/health-scoring.service'
import { buildHealthVisitSnapshots } from '@/features/health-knowledge/services/health-snapshot.service'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

function report(
	overrides: Partial<UploadedHealthReport> & { id: string },
): UploadedHealthReport {
	return {
		user_id: 'user-1',
		file_name: `${overrides.id}.pdf`,
		storage_path: `reports/${overrides.id}.pdf`,
		status: 'completed',
		report_date: '2026-03-09',
		report_type: 'general',
		uploaded_at: '2026-03-09T00:00:00.000Z',
		processed_at: '2026-03-09T00:00:00.000Z',
		created_at: '2026-03-09T00:00:00.000Z',
		family_member_id: null,
		parsed_data: null,
		extracted_text: '',
		ocr_provider: null,
		ocr_confidence: null,
		ocr_page_count: null,
		ocr_processing_time_ms: null,
		ocr_metadata: null,
		processing_error: null,
		...overrides,
	}
}

describe('mergeHealthObservations', () => {
	it('merges stored and parsed metrics instead of choosing one path', () => {
		const reports = [
			report({
				id: 'report-old',
				report_date: '2024-06-01',
				parsed_data: {
					id: 'report-old',
					documentId: 'report-old',
					metadata: {
						reportType: 'heart',
						laboratory: 'Thyrocare',
						reportDate: '2024-06-01',
					},
					metrics: [
						{
							canonicalId: 'ldl',
							displayName: 'LDL Cholesterol',
							rawName: 'LDL',
							value: '120',
							numericValue: 120,
							unit: 'mg/dL',
							status: 'high',
							confidence: 0.9,
							referenceRange: { rawText: '< 100' },
						},
					],
					metricResults: [],
					extractedText: '',
					createdAt: '2024-06-01T00:00:00.000Z',
				},
			}),
			report({
				id: 'report-2026',
				report_date: '2026-03-09',
				parsed_data: {
					id: 'report-2026',
					documentId: 'report-2026',
					metadata: {
						reportType: 'general',
						laboratory: 'Thyrocare',
						reportDate: '2026-03-09',
					},
					metrics: [
						{
							canonicalId: 'creatinine',
							displayName: 'Creatinine',
							rawName: 'S.Creatinine',
							value: '0.9',
							numericValue: 0.9,
							unit: 'mg/dL',
							status: 'normal',
							confidence: 0.9,
							referenceRange: { rawText: '0.6-1.2' },
						},
						{
							canonicalId: 'tsh',
							displayName: 'TSH',
							rawName: 'TSH Ultrasensitive',
							value: '2.1',
							numericValue: 2.1,
							unit: 'µIU/mL',
							status: 'normal',
							confidence: 0.9,
							referenceRange: { rawText: '0.4-4.0' },
						},
						{
							canonicalId: 'vitamin-d',
							displayName: 'Vitamin D',
							rawName: 'Vit D',
							value: '42',
							numericValue: 42,
							unit: 'ng/mL',
							status: 'normal',
							confidence: 0.9,
							referenceRange: { rawText: '30-100' },
						},
						{
							canonicalId: 'hba1c',
							displayName: 'HbA1c',
							rawName: 'HbA1c',
							value: '5.4',
							numericValue: 5.4,
							unit: '%',
							status: 'normal',
							confidence: 0.9,
							referenceRange: { rawText: '< 5.7' },
						},
						{
							canonicalId: 'alt',
							displayName: 'ALT',
							rawName: 'ALT',
							value: '22',
							numericValue: 22,
							unit: 'U/L',
							status: 'normal',
							confidence: 0.9,
							referenceRange: { rawText: '< 40' },
						},
					],
					metricResults: [],
					extractedText: '',
					createdAt: '2026-03-09T00:00:00.000Z',
				},
			}),
		]

		const storedMetrics: StoredHealthMetric[] = [
			{
				id: 'metric-1',
				user_id: 'user-1',
				report_id: 'report-old',
				canonical_metric_id: 'ldl',
				display_name: 'LDL Cholesterol',
				raw_name: 'LDL',
				value: '120',
				numeric_value: 120,
				unit: 'mg/dL',
				status: 'high',
				category: 'heart',
				observed_at: '2024-06-01T00:00:00.000Z',
				report_date: '2024-06-01',
				confidence: 0.9,
				source: 'parser',
				family_member_id: null,
				workflow_item_id: null,
				reference_range_raw: '< 100',
				reference_lower: null,
				reference_upper: 100,
				created_at: '2024-06-01T00:00:00.000Z',
			},
		]

		const merged = mergeHealthObservations({
			storedMetrics,
			uploadedReports: reports,
		})

		expect(merged.some((item) => item.reportId === 'report-2026')).toBe(true)
		expect(merged.some((item) => item.canonicalMetricId === 'creatinine')).toBe(
			true,
		)
		expect(merged.some((item) => item.canonicalMetricId === 'tsh')).toBe(true)

		const graph = buildHealthKnowledgeGraph({
			personId: 'user-1',
			uploadedReports: reports,
			storedMetrics,
		})

		expect(graph.profile.reportIds).toContain('report-2026')
		expect(
			graph.profile.metricHistories.some(
				(history) => history.canonicalMetricId === 'creatinine',
			),
		).toBe(true)
		expect(
			graph.profile.metricHistories.some(
				(history) => history.canonicalMetricId === 'tsh',
			),
		).toBe(true)

		const creatinine = graph.profile.metricHistories.find(
			(history) => history.canonicalMetricId === 'creatinine',
		)
		expect(creatinine?.baseline.lastObservedAt).toContain('2026')

		const snapshots = buildHealthVisitSnapshots({ graph, reports })
		const latest = snapshots[0]
		expect(latest?.reportId).toBe('report-2026')
		expect(
			latest?.majorMetrics.some(
				(metric) => metric.canonicalMetricId === 'creatinine',
			),
		).toBe(true)

		const score = computeHealthScoreFromHistories(graph.profile.metricHistories)
		expect(score).not.toBeNull()
	})

	it('uses filename report date when parsed metadata month conflicts', () => {
		const reports = [
			report({
				id: 'report-feb-2026',
				file_name: 'Feb 2026 Company plan.pdf',
				uploaded_at: '2026-08-03T10:00:00.000Z',
				report_date: '2026-08-03',
				parsed_data: {
					id: 'report-feb-2026',
					documentId: 'report-feb-2026',
					metadata: {
						reportType: 'general',
						laboratory: 'Thyrocare',
						reportDate: '2026-08-03',
					},
					metrics: [
						{
							canonicalId: 'ldl',
							displayName: 'LDL Cholesterol',
							rawName: 'LDL',
							value: '110',
							numericValue: 110,
							unit: 'mg/dL',
							status: 'high',
							confidence: 0.9,
							referenceRange: { rawText: '< 100' },
						},
					],
					metricResults: [],
					extractedText: '',
					createdAt: '2026-08-03T00:00:00.000Z',
				},
			}),
		]

		const merged = mergeHealthObservations({
			storedMetrics: [],
			uploadedReports: reports,
		})

		expect(merged[0]?.observedAt).toContain('2026-02')
	})
})
