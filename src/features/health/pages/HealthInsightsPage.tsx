import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { FigmaHealthInsightsView } from '@/ui/figma/health/figma-health-views'

export function HealthInsightsPage() {
	const navigate = useNavigate()
	const { companion, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()

	if (isLoading) {
		return <DashboardSkeleton />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your health insights."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports || companion.insightGroups.length === 0) {
		return (
			<DashboardEmptyState
				title="Insights will appear here"
				message="Chronicle turns your lab results into plain-language guidance once reports are added."
				emoji="✨"
				actionLabel={HEALTH_COPY.emptyAddReports}
				onAction={() => navigate(ROUTES.healthSettings)}
			/>
		)
	}

	return <FigmaHealthInsightsView groups={companion.insightGroups} />
}
