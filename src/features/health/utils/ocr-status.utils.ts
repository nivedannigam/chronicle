import type { UploadedHealthReport } from '@/features/health/types'
import {
	hasLegacyApproximateOcr,
	needsOcrReprocess,
} from '@/features/health/services/health-parsed-report.service'

export function countReportsNeedingOcrReprocess(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(
		(report) => report.status === 'completed' && needsOcrReprocess(report),
	).length
}

export function countLegacyApproximateOcrReports(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(
		(report) =>
			report.status === 'completed' && hasLegacyApproximateOcr(report),
	).length
}
