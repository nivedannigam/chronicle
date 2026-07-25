import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { C } from '@/constants/colors'
import { healthMetricPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { HealthMetricInsightGroups } from '@/features/health/components/companion/HealthMetricInsightGroups'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { TrendChartGrid } from '@/features/health/components/TrendChart'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { HealthSectionLabel } from '@/features/health/components/companion/HealthAttentionList'

export function HealthMetricsPage() {
	const navigate = useNavigate()
	const {
		companion,
		trendSeries,
		hasImportedReports,
		isLoading,
		isError,
		refetch,
	} = useHealthCompanion()

	if (isLoading) {
		return <ListSkeleton rows={4} height={120} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your health numbers."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports) {
		return (
			<>
				<DashboardEmptyState
					title="No numbers yet"
					message="Import health reports to see how your key markers are changing."
					emoji="📊"
					actionLabel={HEALTH_COPY.emptyAddReports}
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
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				Start with what matters — then explore the trends behind each number.
			</div>

			<HealthMetricInsightGroups groups={companion.metricGroups} />

			{trendSeries.length > 0 ? (
				<section style={{ marginTop: 24 }}>
					<HealthSectionLabel>Trends over time</HealthSectionLabel>
					<TrendChartGrid
						series={trendSeries}
						onSeriesClick={(metricId) => navigate(healthMetricPath(metricId))}
					/>
				</section>
			) : (
				<DashboardEmptyState
					title="Charts will appear here"
					message="Once Chronicle finds measurable lab values, you'll see trends for each marker."
					emoji="📈"
				/>
			)}
		</>
	)
}

/** @deprecated Use HealthMetricsPage */
export const HealthTrendsPage = HealthMetricsPage
