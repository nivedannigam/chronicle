import type {
	HealthReport,
	HealthTimelineItem,
	UploadedHealthReport,
} from '@/features/health/types'
import { formatUploadedReportDate } from '@/features/health/services/health-upload.service'

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
			a.type === 'mock' ? a.report.date : a.report.uploaded_at.slice(0, 10)
		const dateB =
			b.type === 'mock' ? b.report.date : b.report.uploaded_at.slice(0, 10)

		return new Date(dateB).getTime() - new Date(dateA).getTime()
	})
}

export function getTimelineDisplayDate(item: HealthTimelineItem): string {
	if (item.type === 'mock') {
		return item.report.displayDate
	}

	return formatUploadedReportDate(item.report.uploaded_at)
}

export function getTimelineTitle(item: HealthTimelineItem): string {
	if (item.type === 'mock') {
		return item.report.title
	}

	return item.report.file_name
}
