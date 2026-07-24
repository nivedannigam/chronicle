import type {
	HealthReport,
	HealthTimelineItem,
	UploadedHealthReport,
} from '@/features/health/types'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'

export function buildHealthTimeline(
	mockReports: HealthReport[],
	uploadedReports: UploadedHealthReport[],
): HealthTimelineItem[] {
	const mockItems: HealthTimelineItem[] = mockReports.map((report) => ({
		type: 'mock',
		report,
	}))

	const uploadItems: HealthTimelineItem[] = uploadedReports.map((report) => ({
		type: 'upload',
		report,
	}))

	return [...mockItems, ...uploadItems].sort((a, b) => {
		const dateA =
			a.type === 'mock'
				? a.report.date
				: (a.report.report_date ?? a.report.uploaded_at.slice(0, 10))
		const dateB =
			b.type === 'mock'
				? b.report.date
				: (b.report.report_date ?? b.report.uploaded_at.slice(0, 10))

		return new Date(dateB).getTime() - new Date(dateA).getTime()
	})
}

export function getTimelineDisplayDate(item: HealthTimelineItem): string {
	if (item.type === 'mock') {
		return item.report.displayDate
	}

	const parsed = getParsedHealthReport(item.report)

	if (parsed?.metadata.reportDate) {
		return new Date(parsed.metadata.reportDate).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
	}

	return getReportDisplayDate(item.report, parsed)
}

export function getTimelineTitle(item: HealthTimelineItem): string {
	if (item.type === 'mock') {
		return item.report.title
	}

	const parsed = getParsedHealthReport(item.report)

	if (parsed) {
		return `${getReportDisplayTitle(item.report)} · ${parsed.metadata.laboratory}`
	}

	return item.report.file_name
}

export function uploadedReportToTimelineItem(
	report: UploadedHealthReport,
): HealthTimelineItem {
	return { type: 'upload', report }
}
