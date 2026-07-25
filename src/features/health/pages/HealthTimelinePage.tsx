import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { HealthJourneyTimeline } from '@/features/health/components/companion/HealthJourneyTimeline'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'

export function HealthTimelinePage() {
	const navigate = useNavigate()
	const { companion, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()

	if (isLoading) {
		return <ListSkeleton rows={5} height={64} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your health timeline."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports || companion.journeyEvents.length === 0) {
		return (
			<>
				<HealthSetupGuide compact />
				<DashboardEmptyState
					title="Your health journey will appear here"
					message="Checkups, findings, and improvements from your reports will show up as a readable timeline — not an upload log."
					emoji="🩺"
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
				A readable story of checkups, findings, and improvements — not file
				uploads.
			</div>

			<HealthJourneyTimeline events={companion.journeyEvents} />
		</>
	)
}
