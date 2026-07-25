import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { HealthNarrativeInsights } from '@/features/health/components/companion/HealthNarrativeInsights'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'

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
				<HealthSetupGuide compact />
				<DashboardEmptyState
					title="Insights will appear here"
					message="Chronicle turns your lab results into plain-language guidance once reports are added."
					emoji="✨"
					actionLabel="Add reports"
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
				A narrative summary of what your records mean — written for you, not for
				developers.
			</div>

			<HealthNarrativeInsights paragraphs={companion.narrative} />
		</>
	)
}
