import { useMemo } from 'react'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { buildHealthProgressViewModel } from '@/features/health/services/health-progress.mapper'
import type { ProgressViewModel } from '@/features/progress/types/progress.types'

export function useHealthProgress() {
	const dashboard = useHealthCompanion()

	const progress = useMemo(
		(): ProgressViewModel =>
			buildHealthProgressViewModel({
				companion: dashboard.companion,
				graph: dashboard.knowledgeGraph,
				trendSeries: dashboard.trendSeries,
			}),
		[dashboard.companion, dashboard.knowledgeGraph, dashboard.trendSeries],
	)

	return {
		...dashboard,
		progress,
	}
}
