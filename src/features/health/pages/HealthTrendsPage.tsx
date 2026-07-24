import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { C } from '@/constants/colors'
import { healthMetricPath, ROUTES } from '@/constants/routes'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { TrendChartGrid } from '@/features/health/components/TrendChart'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'

export function HealthTrendsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const uploadedQuery = useUploadedHealthReports(user?.id)
	const uploadedReports = uploadedQuery.data ?? []
	const hasImportedReports = uploadedReports.some(
		(report) => report.status === 'completed',
	)
	const knowledge = useHealthKnowledge(user?.id, uploadedReports)
	const series = knowledge.trendSeries

	if (!hasImportedReports) {
		return (
			<DashboardEmptyState
				title="No trends yet"
				message="Import at least one health report to see how your markers change over time."
				emoji="📈"
				actionLabel="Go to Health Sources"
				onAction={() => navigate(ROUTES.healthSources)}
			/>
		)
	}

	return (
		<>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				Track how your key health markers change over time.
			</div>
			<HealthSectionHeader title="Trends" />
			{series.length === 0 ? (
				<DashboardEmptyState
					title="No trend data"
					message="Metrics from imported reports will appear here."
					emoji="📈"
				/>
			) : (
				<TrendChartGrid
					series={series}
					onSeriesClick={(metricId) => navigate(healthMetricPath(metricId))}
				/>
			)}
		</>
	)
}
