import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { FigmaHealthMetricsView } from '@/ui/figma/health/figma-health-views'

export function HealthMetricsPage() {
	const navigate = useNavigate()
	const { companion, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()

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

	if (!hasImportedReports || companion.metricGroups.length === 0) {
		return (
			<DashboardEmptyState
				title="No numbers yet"
				message="Import health reports to see how your key markers are changing."
				emoji="📊"
				actionLabel={HEALTH_COPY.emptyAddReports}
				onAction={() => navigate(ROUTES.healthSettings)}
			/>
		)
	}

	return <FigmaHealthMetricsView companion={companion} />
}

/** @deprecated Use HealthMetricsPage */
export const HealthTrendsPage = HealthMetricsPage
