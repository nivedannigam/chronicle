import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { buildHealthVisits } from '@/features/health/services/health-visit.mapper'
import { FigmaHealthVisitsListView } from '@/ui/figma/health/FigmaHealthVisitsListView'

export function HealthReportsPage() {
	const navigate = useNavigate()
	const { reports, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()

	const visits = useMemo(() => buildHealthVisits(reports), [reports])

	if (isLoading) {
		return <ListSkeleton rows={4} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your health visits."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports && visits.length === 0) {
		return (
			<DashboardEmptyState
				title={HEALTH_COPY.emptyVisitsTitle}
				message={HEALTH_COPY.emptyVisitsBody}
				emoji="📋"
				actionLabel={HEALTH_COPY.connectDrive}
				onAction={() => navigate(ROUTES.profileConnectionsDrive)}
				secondaryActionLabel={HEALTH_COPY.chooseFolder}
				onSecondaryAction={() => navigate(ROUTES.healthFolderSetup)}
			/>
		)
	}

	return <FigmaHealthVisitsListView visits={visits} rawReports={reports} />
}
