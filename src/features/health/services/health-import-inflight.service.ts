import type {
	HealthReportStatus,
	UploadedHealthReport,
} from '@/features/health/types'

const IMPORT_IN_FLIGHT_STATUSES: HealthReportStatus[] = [
	'uploaded',
	'queued',
	'processing',
	'parsed',
]

export function isHealthImportInFlight(
	reports: UploadedHealthReport[],
): boolean {
	return reports.some((report) =>
		IMPORT_IN_FLIGHT_STATUSES.includes(report.status),
	)
}
