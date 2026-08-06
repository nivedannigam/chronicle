import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthContext } from '@/features/health/context/HealthContext'
import { FigmaHealthReportsListView } from '@/ui/figma/health/FigmaHealthReportsListView'

export function HealthReportsPage() {
	const navigate = useNavigate()
	const {
		reportCards,
		reports,
		hasImportedReports,
		isLoading,
		isError,
		refetch,
	} = useHealthContext()

	if (isLoading) {
		return <ListSkeleton rows={4} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your health reports."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports && reportCards.length === 0) {
		return (
			<DashboardEmptyState
				title={HEALTH_COPY.emptyReportsTitle}
				message={HEALTH_COPY.emptyReportsBody}
				emoji="📋"
				actionLabel={HEALTH_COPY.connectDrive}
				onAction={() => navigate(ROUTES.profileConnectionsDrive)}
				secondaryActionLabel={HEALTH_COPY.chooseFolder}
				onSecondaryAction={() => navigate(ROUTES.healthFolderSetup)}
			/>
		)
	}

	return (
		<FigmaHealthReportsListView reports={reportCards} rawReports={reports} />
	)
}
