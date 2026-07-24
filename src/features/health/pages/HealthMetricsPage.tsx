import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { healthMetricPath, ROUTES } from '@/constants/routes'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { TrendChartGrid } from '@/features/health/components/TrendChart'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'

export function HealthMetricsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const uploadedQuery = useMemberHealthReports()
	const uploadedReports = uploadedQuery.data ?? []
	const hasImportedReports = uploadedReports.some(
		(report) => report.status === 'completed',
	)
	const knowledge = useHealthKnowledge(user?.id, uploadedReports)
	const series = knowledge.trendSeries

	if (uploadedQuery.isLoading) {
		return (
			<DashboardEmptyState title="Loading metrics…" message="" emoji="⏳" />
		)
	}

	if (uploadedQuery.isError) {
		return (
			<DashboardEmptyState
				title="Metrics unavailable"
				message="We couldn't load your metrics. Try again in a moment."
				emoji="📊"
				actionLabel="Try again"
				onAction={() => void uploadedQuery.refetch()}
			/>
		)
	}

	if (!hasImportedReports) {
		return (
			<>
				<HealthSetupGuide compact />
				<DashboardEmptyState
					title="No metrics yet"
					message="Import health reports to see extracted lab values and trends."
					emoji="📊"
					actionLabel="Open Health settings"
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</>
		)
	}

	return (
		<>
			<div
				style={{
					fontSize: 14,
					color: 'rgba(255,255,255,0.55)',
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				Only metrics extracted from your imported reports are shown.
			</div>
			<HealthSectionHeader title="Extracted Metrics" />
			{series.length === 0 ? (
				<DashboardEmptyState
					title="No metric data"
					message="Reports may still be processing, or no structured metrics were found."
					emoji="📊"
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

/** @deprecated Use HealthMetricsPage */
export const HealthTrendsPage = HealthMetricsPage
