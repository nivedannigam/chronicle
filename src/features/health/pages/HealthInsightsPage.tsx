import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { HealthNarrativeInsights } from '@/features/health/components/companion/HealthNarrativeInsights'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { HealthPageIntro } from '@/ui/figma/health/health-ui'

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

	if (!hasImportedReports) {
		return (
			<>
				<DashboardEmptyState
					title="Insights will appear here"
					message="Chronicle turns your lab results into plain-language guidance once reports are added."
					emoji="✨"
					actionLabel={HEALTH_COPY.emptyAddReports}
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</>
		)
	}

	return (
		<>
			<HealthPageIntro>{HEALTH_COPY.insightsIntro}</HealthPageIntro>

			<HealthNarrativeInsights paragraphs={companion.narrative} />
		</>
	)
}
