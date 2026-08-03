import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { filterMajorHistoryEvents } from '@/features/health/services/health-product.mapper'
import { FigmaHealthHistoryView } from '@/ui/figma/health/FigmaHealthHistoryView'

export function HealthHistoryPage() {
	const navigate = useNavigate()
	const { companion, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()

	const events = filterMajorHistoryEvents(companion.journeyEvents)

	if (isLoading) {
		return <ListSkeleton rows={5} height={64} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your health history."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports || events.length === 0) {
		return (
			<DashboardEmptyState
				title={HEALTH_COPY.emptyHistoryTitle}
				message={HEALTH_COPY.emptyHistoryBody}
				emoji="🩺"
				actionLabel={HEALTH_COPY.connectDrive}
				onAction={() => navigate(ROUTES.profileConnectionsDrive)}
				secondaryActionLabel={HEALTH_COPY.chooseFolder}
				onSecondaryAction={() => navigate(ROUTES.healthFolderSetup)}
			/>
		)
	}

	return <FigmaHealthHistoryView events={events} />
}
