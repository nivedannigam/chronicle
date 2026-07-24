import { useMemo } from 'react'
import { DASHBOARD_SECTIONS } from '@/features/health/config/dashboard-sections.config'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'

export function useDashboardSectionHistories(
	metricHistories: HealthMetricHistory[],
) {
	return useMemo(() => {
		return DASHBOARD_SECTIONS.map((section) => ({
			section,
			histories: section.metricIds
				.map((metricId) =>
					metricHistories.find(
						(history) => history.canonicalMetricId === metricId,
					),
				)
				.filter((history): history is HealthMetricHistory => Boolean(history)),
		}))
	}, [metricHistories])
}
