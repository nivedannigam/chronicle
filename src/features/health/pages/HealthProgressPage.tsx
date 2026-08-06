import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthContext } from '@/features/health/context/HealthContext'
import { FigmaHealthProgressView } from '@/ui/figma/health/FigmaHealthProgressView'

export function HealthProgressPage() {
	const navigate = useNavigate()
	const { progress, hasImportedReports, isLoading, isError, refetch } =
		useHealthContext()

	if (isLoading) {
		return <ListSkeleton rows={6} height={72} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your health progress."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports) {
		return (
			<DashboardEmptyState
				title={HEALTH_COPY.emptyProgressTitle}
				message={HEALTH_COPY.emptyProgressBody}
				emoji="📈"
				actionLabel={HEALTH_COPY.connectDrive}
				onAction={() => navigate(ROUTES.profileConnectionsDrive)}
				secondaryActionLabel={HEALTH_COPY.chooseFolder}
				onSecondaryAction={() => navigate(ROUTES.healthFolderSetup)}
			/>
		)
	}

	return <FigmaHealthProgressView progress={progress} />
}
