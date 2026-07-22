import { useMemo } from 'react'
import { getHealthReportById } from '@/features/health/services/health.service'

export function useHealthReport(reportId: string | undefined) {
	return useMemo(() => {
		if (!reportId) {
			return undefined
		}

		return getHealthReportById(reportId)
	}, [reportId])
}
