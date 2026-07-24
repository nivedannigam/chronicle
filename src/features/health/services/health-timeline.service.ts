import type {
	HealthTimelineItem,
	UploadedHealthReport,
} from '@/features/health/types'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'

export function buildHealthTimeline(uploadedReports: UploadedHealthReport[]) {
	return [...uploadedReports]
		.map((report) => ({ type: 'upload' as const, report }))
		.sort((a, b) => {
			const dateA = a.report.report_date ?? a.report.uploaded_at.slice(0, 10)
			const dateB = b.report.report_date ?? b.report.uploaded_at.slice(0, 10)
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

export function uploadedReportToTimelineItem(report: UploadedHealthReport) {
	return { type: 'upload' as const, report }
}
