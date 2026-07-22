import { useMemo } from 'react'
import {
	getHealthCategories,
	getHealthDashboard,
	getHealthReports,
	getLatestHealthReport,
} from '@/features/health/services/health.service'

export function useHealthDashboard() {
	return useMemo(
		() => ({
			dashboard: getHealthDashboard(),
			latestReport: getLatestHealthReport(),
			categories: getHealthCategories(),
			reports: getHealthReports(),
		}),
		[],
	)
}
