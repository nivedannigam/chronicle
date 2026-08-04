import { describe, expect, it } from 'vitest'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	buildHealthVisits,
	extractVisitTitleHint,
	findHealthVisit,
} from '@/features/health/services/health-visit.mapper'

function makeReport(input: {
	id: string
	fileName: string
	date: string
	laboratory?: string
	reportType?: string
	status?: UploadedHealthReport['status']
	parsed_data?: UploadedHealthReport['parsed_data']
}): UploadedHealthReport {
	return {
		id: input.id,
		user_id: 'user-1',
		family_member_id: 'member-1',
		file_name: input.fileName,
		file_path: `${input.id}.pdf`,
		status: input.status ?? 'completed',
		uploaded_at: `${input.date}T10:00:00.000Z`,
		report_date: input.date,
		report_type: input.reportType ?? 'general',
		parsed_data: input.parsed_data ?? {
			metrics: [],
			metadata: {
				reportDate: input.date,
				laboratory: input.laboratory ?? 'Thyrocare',
				reportType: input.reportType ?? 'general',
			},
		},
	} as unknown as UploadedHealthReport
}

describe('extractVisitTitleHint', () => {
	it('extracts checkup titles from dated filenames', () => {
		expect(extractVisitTitleHint('2026 Mar - Annual Health Checkup.pdf')).toBe(
			'Annual Health Checkup',
		)
	})

	it('ignores single test filenames', () => {
		expect(extractVisitTitleHint('2026 Mar - Blood Test.pdf')).toBeNull()
	})
})

describe('buildHealthVisits', () => {
	it('groups same-lab reports within two days into one visit', () => {
		const visits = buildHealthVisits([
			makeReport({
				id: 'r1',
				fileName: '2026-03-10 Blood Test.pdf',
				date: '2026-03-10',
				reportType: 'blood-count',
			}),
			makeReport({
				id: 'r2',
				fileName: '2026-03-11 Urine Report.pdf',
				date: '2026-03-11',
				reportType: 'general',
			}),
			makeReport({
				id: 'r3',
				fileName: '2026-03-11 ECG.pdf',
				date: '2026-03-11',
				reportType: 'ecg',
			}),
		])

		expect(visits).toHaveLength(1)
		expect(visits[0]?.reportCount).toBe(3)
		expect(visits[0]?.title).toBe('Health Checkup')
	})

	it('keeps distant dates separate even at the same lab', () => {
		const visits = buildHealthVisits([
			makeReport({
				id: 'r1',
				fileName: '2026-01-10 Vitamin D Test.pdf',
				date: '2026-01-10',
				reportType: 'vitamin',
			}),
			makeReport({
				id: 'r2',
				fileName: '2026-03-10 Blood Test.pdf',
				date: '2026-03-10',
				reportType: 'blood-count',
			}),
		])

		expect(visits).toHaveLength(2)
	})

	it('does not group conflicting labs on the same day', () => {
		const visits = buildHealthVisits([
			makeReport({
				id: 'r1',
				fileName: '2026-03-10 Blood Test.pdf',
				date: '2026-03-10',
				laboratory: 'Thyrocare',
			}),
			makeReport({
				id: 'r2',
				fileName: '2026-03-10 Blood Test.pdf',
				date: '2026-03-10',
				laboratory: 'Apollo',
			}),
		])

		expect(visits).toHaveLength(2)
	})

	it('shows organizing summary when visit reports are still processing', () => {
		const visits = buildHealthVisits([
			makeReport({
				id: 'r1',
				fileName: '2026-03-10 Blood Test.pdf',
				date: '2026-03-10',
				status: 'processing',
			}),
		])

		expect(visits[0]?.status).toBe('organizing')
		expect(visits[0]?.summaryLine).toBe('Still organizing results')
	})

	it('shows needs-help summary copy for grouped visits with failed reports', () => {
		const visits = buildHealthVisits([
			makeReport({
				id: 'r1',
				fileName: 'Feb 2026 Company plan.pdf',
				date: '2026-02-01',
				status: 'failed',
			}),
			makeReport({
				id: 'r2',
				fileName: 'Feb 2026.pdf',
				date: '2026-02-02',
				status: 'completed',
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
					metadata: {
						reportDate: '2026-02-02',
						laboratory: 'Apollo',
						reportType: 'blood-count',
					},
				},
			}),
		])

		expect(visits[0]?.status).toBe('needs_help')
		expect(visits[0]?.summaryParagraph).toContain('could not finish organizing')
	})
})

describe('findHealthVisit', () => {
	it('finds a visit by anchor report id', () => {
		const visits = buildHealthVisits([
			makeReport({
				id: 'solo-report',
				fileName: '2026-03-10 Vitamin D Test.pdf',
				date: '2026-03-10',
				reportType: 'vitamin',
			}),
		])

		expect(findHealthVisit(visits, 'solo-report')?.id).toBe('solo-report')
	})
})

describe('visit display dates', () => {
	it('uses February from filename when metadata date is an upload month', () => {
		const visits = buildHealthVisits([
			makeReport({
				id: 'feb-report',
				fileName: 'Feb 2026.pdf',
				date: '2026-08-03',
				laboratory: 'Svasth Healthi',
				parsed_data: {
					metrics: [],
					metadata: {
						reportDate: '2026-08-03',
						laboratory: 'Svasth Healthi',
						reportType: 'general',
					},
				},
			}),
		])

		expect(visits[0]?.displayMonthYear).toBe('February 2026')
		expect(visits[0]?.title).toBe('Feb 2026')
	})
})
