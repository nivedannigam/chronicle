import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { buildReportSummaries } from '@/features/health/services/health-companion.service'
import { isReportDisplayReady } from '@/features/health/services/report-readiness.service'
import { FigmaHealthReportsView } from '@/ui/figma/health/figma-health-views'
import { healthSettingsSection } from '@/constants/routes'

export function HealthReportsPage() {
	const navigate = useNavigate()
	const { reports, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()
	const setup = useHealthMemberSetup()

	const summaries = useMemo(() => buildReportSummaries(reports), [reports])
	const partialReportCount = useMemo(
		() =>
			reports.filter(
				(report) =>
					isReportDisplayReady(report) &&
					summaries.every((summary) => summary.id !== report.id),
			).length,
		[reports, summaries],
	)

	if (isLoading) {
		return <ListSkeleton rows={4} />
	}

	if (isError) {
		return (
			<InlineErrorBanner
				message="Could not load your medical records."
				onRetry={() => void refetch()}
			/>
		)
	}

	if (
		!hasImportedReports &&
		summaries.length === 0 &&
		partialReportCount === 0
	) {
		return (
			<DashboardEmptyState
				title="No medical records yet"
				message="Add health reports and Chronicle will organize them like a personal medical file."
				emoji="📋"
				actionLabel={HEALTH_COPY.emptyAddReports}
				onAction={() => navigate(ROUTES.healthSettings)}
			/>
		)
	}

	return (
		<FigmaHealthReportsView
			reports={summaries}
			needsReview={setup.needsReview}
			rawReports={reports}
			partialReportCount={partialReportCount}
			onOpenSetup={() => navigate(healthSettingsSection('import'))}
		/>
	)
}
