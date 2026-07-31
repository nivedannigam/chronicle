import { useMemo } from 'react'
import { useHealthMetrics } from '@/features/health/hooks/useHealthMetrics'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import type { UploadedHealthReport } from '@/features/health/types'

export function useHealthKnowledge(
	userId: string | undefined,
	uploadedReports: UploadedHealthReport[] = [],
) {
	const metricsQuery = useHealthMetrics()
	const storedMetrics = useMemo(
		() => metricsQuery.data ?? [],
		[metricsQuery.data],
	)

	return useMemo(() => {
		const graph = healthKnowledgeService.getGraphForUser(
			userId,
			uploadedReports,
			storedMetrics,
		)

		return {
			graph,
			profile: graph.profile,
			snapshots: healthKnowledgeService.getSnapshots(
				userId,
				uploadedReports,
				storedMetrics,
			),
			insights: healthKnowledgeService.getInsights(
				userId,
				uploadedReports,
				storedMetrics,
			),
			trendSeries: healthKnowledgeService.getTrendSeries(
				userId,
				uploadedReports,
				storedMetrics,
			),
			getMetricHistory: (metricId: string) =>
				healthKnowledgeService.getMetricHistory(
					userId,
					metricId,
					uploadedReports,
					storedMetrics,
				),
			isLoadingMetrics: metricsQuery.isLoading,
		}
	}, [userId, uploadedReports, storedMetrics, metricsQuery.isLoading])
}
