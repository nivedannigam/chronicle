import { describe, expect, it } from 'vitest'
import { runHealthIntegrityAudit } from '@/features/health-knowledge/services/health-integrity-audit.service'
import type { UploadedHealthReport } from '@/features/health/types'

describe('runHealthIntegrityAudit', () => {
	it('flags missing 2026 reports from knowledge and validates merge', () => {
		const reports: UploadedHealthReport[] = [
			{
				id: 'report-2026',
				user_id: 'user-1',
				file_name: 'March 2026 Checkup.pdf',
				storage_path: 'reports/report-2026.pdf',
				status: 'completed',
				report_date: '2026-03-09',
				report_type: 'general',
				uploaded_at: '2026-03-09T00:00:00.000Z',
				processed_at: '2026-03-09T00:00:00.000Z',
				family_member_id: null,
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
					],
					metricResults: [],
					extractedText: '',
					createdAt: '2026-03-09T00:00:00.000Z',
				},
				extracted_text: '',
				ocr_provider: null,
				ocr_confidence: null,
				ocr_page_count: null,
				ocr_processing_time_ms: null,
				ocr_metadata: null,
				processing_error: null,
				created_at: '2026-03-09T00:00:00.000Z',
			},
		]

		const audit = runHealthIntegrityAudit({
			uploadedReports: reports,
			storedMetrics: [],
			yearFilter: 2026,
		})

		expect(audit.reports2026).toEqual(['report-2026'])
		expect(audit.reports2026InKnowledge).toEqual(['report-2026'])
		expect(audit.latestReportId).toBe('report-2026')
		expect(audit.snapshotsCreated).toBe(1)
		expect(audit.warnings).toHaveLength(0)
	})
})
