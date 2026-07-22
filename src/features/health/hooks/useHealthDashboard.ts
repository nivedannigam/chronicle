import { useMemo } from 'react'
import {
	getHealthDashboard,
	getHealthInsights,
	getHealthReports,
	getHealthSnapshots,
	getHealthUploadTimeline,
	getLatestHealthReport,
	getUpcomingActions,
} from '@/features/health/services/health.service'

export function useHealthDashboard() {
	return useMemo(
		() => ({
			dashboard: getHealthDashboard(),
			latestReport: getLatestHealthReport(),
			snapshots: getHealthSnapshots(),
			insights: getHealthInsights(),
			actions: getUpcomingActions(),
			uploadTimeline: getHealthUploadTimeline(),
			reports: getHealthReports(),
		}),
		[],
	)
}
