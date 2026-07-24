import { useMemo } from 'react'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import type { UploadedHealthReport } from '@/features/health/types'

export function useHealthKnowledge(
	userId: string | undefined,
	uploadedReports: UploadedHealthReport[] = [],
) {
	return useMemo(() => {
		const graph = healthKnowledgeService.getGraphForUser(
			userId,
			uploadedReports,
		)

		return {
			graph,
			profile: graph.profile,
			snapshots: healthKnowledgeService.getSnapshots(userId, uploadedReports),
			insights: healthKnowledgeService.getInsights(userId, uploadedReports),
			trendSeries: healthKnowledgeService.getTrendSeries(
				userId,
				uploadedReports,
			),
			getMetricHistory: (metricId: string) =>
				healthKnowledgeService.getMetricHistory(
					userId,
					metricId,
					uploadedReports,
				),
		}
	}, [userId, uploadedReports])
}
