import { useMemo } from 'react'
import { useAuth } from '@/features/auth'
import { healthInsightsService } from '@/features/health-insights/services/health-insights.service'
import type { ChronicleInsight } from '@/features/health-insights/types/health-insights.types'
import { useHealthDashboard } from '@/features/health/hooks/useHealthDashboard'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { useHealthMetrics } from '@/features/health/hooks/useHealthMetrics'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { buildHealthCompanionView } from '@/features/health/services/health-companion.service'
import type { UploadedHealthReport } from '@/features/health/types'

const EMPTY_REPORTS: UploadedHealthReport[] = []
const EMPTY_INSIGHTS: ChronicleInsight[] = []

export function useHealthCompanion(uploadedReports?: UploadedHealthReport[]) {
	const { user } = useAuth()
	const userId = user?.id
	const uploadedQuery = useMemberHealthReports()
	const reports = useMemo(
		() => uploadedReports ?? uploadedQuery.data ?? EMPTY_REPORTS,
		[uploadedReports, uploadedQuery.data],
	)
	const setup = useHealthMemberSetup()
	const dashboard = useHealthDashboard(reports)
	const metricsQuery = useHealthMetrics()
	const storedMetrics = metricsQuery.data ?? []

	const proactiveInsights = userId
		? healthInsightsService.getProactiveHealthInsights({
				userId,
				uploadedReports: reports,
				storedMetrics,
			}).insights
		: EMPTY_INSIGHTS

	const companion = useMemo(
		() =>
			buildHealthCompanionView({
				graph: dashboard.knowledgeGraph,
				uploadedReports: reports,
				insights: proactiveInsights,
				needsReview: setup.needsReview,
				trendSeries: dashboard.trendSeries,
				personId: userId,
			}),
		[
			dashboard.knowledgeGraph,
			dashboard.trendSeries,
			reports,
			proactiveInsights,
			setup.needsReview,
			userId,
		],
	)

	return {
		...dashboard,
		companion,
		reports,
		isLoading: uploadedQuery.isLoading || setup.isLoading,
		isError: uploadedQuery.isError,
		refetch: uploadedQuery.refetch,
	}
}
