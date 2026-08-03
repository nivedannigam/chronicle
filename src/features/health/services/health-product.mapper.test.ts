import { describe, expect, it } from 'vitest'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	buildProductReportCard,
	getProductReportStatusLabel,
	mapProductReportStatus,
} from '@/features/health/services/health-product.mapper'

function makeReport(input: {
	id: string
	status: UploadedHealthReport['status']
	metrics?: Array<{ name: string; value: string; status: string }>
	reportType?: string
	laboratory?: string
	fileName?: string
}): UploadedHealthReport {
	return {
		id: input.id,
		user_id: 'user-1',
		family_member_id: 'member-1',
		file_name: input.fileName ?? 'Blood Test.pdf',
		file_path: `${input.id}.pdf`,
		status: input.status,
		uploaded_at: '2026-03-10T10:00:00.000Z',
		report_date: '2026-03-10',
		report_type: input.reportType ?? 'blood-count',
		parsed_data: {
			metrics: input.metrics ?? [
				{ name: 'Hemoglobin', value: '14', status: 'normal' },
			],
			metadata: {
				reportDate: '2026-03-10',
				laboratory: input.laboratory ?? 'Thyrocare',
				reportType: input.reportType ?? 'blood-count',
			},
		},
	} as unknown as UploadedHealthReport
}

describe('mapProductReportStatus', () => {
	it('marks display-ready completed reports as ready', () => {
		const report = makeReport({ id: 'r1', status: 'completed' })

		expect(mapProductReportStatus(report)).toBe('ready')
	})

	it('marks in-flight reports as organizing', () => {
		const report = makeReport({ id: 'r1', status: 'processing' })

		expect(mapProductReportStatus(report)).toBe('organizing')
	})

	it('marks completed reports without metrics as needs_help', () => {
		const report = makeReport({
			id: 'r1',
			status: 'completed',
			metrics: [],
			reportType: 'general',
			fileName: 'Iron Test.pdf',
		})

		expect(mapProductReportStatus(report)).toBe('needs_help')
	})

	it('marks metricless ECG reports as ready', () => {
		const report = makeReport({
			id: 'r1',
			status: 'completed',
			metrics: [],
			reportType: 'ecg',
			fileName: 'ECG Report.pdf',
		})

		expect(mapProductReportStatus(report)).toBe('ready')
	})
})

describe('buildProductReportCard', () => {
	it('sanitizes junk laboratory names for display', () => {
		const card = buildProductReportCard(
			makeReport({
				id: 'r1',
				status: 'completed',
				laboratory: '& Diagnostics',
			}),
		)

		expect(card.hospital).toBe('Medical center')
	})

	it('keeps plausible laboratory names', () => {
		const card = buildProductReportCard(
			makeReport({
				id: 'r1',
				status: 'completed',
				laboratory: 'Qtest Kharadi',
			}),
		)

		expect(card.hospital).toBe('Qtest Kharadi')
	})
})

describe('getProductReportStatusLabel', () => {
	it('shows import failed for failed pipeline status', () => {
		expect(
			getProductReportStatusLabel(
				makeReport({ id: 'r1', status: 'failed', metrics: [] }),
			),
		).toBe('Import failed')
	})

	it('shows ready for display-ready completed reports', () => {
		expect(
			getProductReportStatusLabel(
				makeReport({ id: 'r1', status: 'completed' }),
			),
		).toBe('Ready')
	})
})
