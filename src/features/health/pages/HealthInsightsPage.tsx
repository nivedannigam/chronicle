import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthInsightsList } from '@/features/health/components/HealthInsightsList'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useHealthDashboard } from '@/features/health/hooks/useHealthDashboard'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'

export function HealthInsightsPage() {
	const navigate = useNavigate()
	const uploadedQuery = useMemberHealthReports()
	const uploadedReports = uploadedQuery.data ?? []
	const { insights, hasImportedReports } = useHealthDashboard(uploadedReports)

	if (uploadedQuery.isLoading) {
		return <DashboardSkeleton />
	}

	if (uploadedQuery.isError) {
		return (
			<DashboardEmptyState
				title="Could not load insights"
				message="Check your connection and try again."
				emoji="⚠️"
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
					title="No insights yet"
					message="Insights are generated from your extracted lab data — import reports to get started."
					emoji="✨"
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
				Summaries based on your actual lab results — not generated fiction.
			</div>

			<HealthSectionHeader title="Health Insights" />

			{insights.length === 0 ? (
				<DashboardEmptyState
					title="No insights available"
					message="Import more reports with measurable lab values to unlock trend-based insights."
					emoji="✨"
				/>
			) : (
				<HealthInsightsList insights={insights} />
			)}
		</>
	)
}
