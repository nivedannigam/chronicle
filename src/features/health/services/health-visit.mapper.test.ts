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
		parsed_data: {
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
