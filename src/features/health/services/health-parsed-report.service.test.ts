import { describe, expect, it } from 'vitest'
import {
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'

function mockReport(
	overrides: Partial<UploadedHealthReport> = {},
): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: 'user-1',
		file_name: 'report.pdf',
		status: 'completed',
		uploaded_at: '2026-08-03T10:00:00.000Z',
		...overrides,
	} as UploadedHealthReport
}

describe('getReportDisplayTitle', () => {
	it('uses filename when report type is general', () => {
		expect(
			getReportDisplayTitle(
				mockReport({
					file_name: '2023 Feb - Serum Electrolytes.pdf',
					parsed_data: {
						metadata: { reportType: 'general', laboratory: 'Thyrocare' },
						metrics: [],
					},
				}),
			),
		).toBe('Serum Electrolytes Report')
	})

	it('prefers specific report types over generic filenames', () => {
		expect(
			getReportDisplayTitle(
				mockReport({
					file_name: 'scan.pdf',
					report_type: 'blood-count',
				}),
			),
		).toBe('Blood Count Report')
	})

	it('uses filename for iron and CEA tests instead of generic type labels', () => {
		expect(
			getReportDisplayTitle(
				mockReport({
					file_name: 'Iron Test 2026.pdf',
					report_type: 'iron',
				}),
			),
		).toBe('Iron Test 2026')

		expect(
			getReportDisplayTitle(
				mockReport({
					file_name: 'CEA Test Feb 2026.pdf',
					report_type: 'general',
				}),
			),
		).toBe('CEA Test Feb 2026')
	})
})

describe('getReportDisplayDate', () => {
	it('falls back to filename date before upload date', () => {
		expect(
			getReportDisplayDate(
				mockReport({
					file_name: '2023 Feb - Serum Electrolytes.pdf',
					uploaded_at: '2026-08-03T10:00:00.000Z',
				}),
			),
		).toBe('2023-02-01')
	})

	it('prefers parsed metadata date over filename', () => {
		expect(
			getReportDisplayDate(
				mockReport({
					file_name: '2023 Feb - Serum Electrolytes.pdf',
					parsed_data: {
						metadata: { reportDate: '2023-02-14', reportType: 'electrolytes' },
						metrics: [],
					},
				}),
			),
		).toBe('2023-02-14')
	})
})
