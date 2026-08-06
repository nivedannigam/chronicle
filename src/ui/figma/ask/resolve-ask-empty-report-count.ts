import type { UploadedHealthReport } from '@/features/health/types'
import { isReportDisplayReady } from '@/features/health/services/report-readiness.service'

export function resolveAskEmptyReportCount(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(isReportDisplayReady).length
}
