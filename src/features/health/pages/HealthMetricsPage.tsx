import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { MODULE_UX_COPY } from '@/features/modules/contracts/module-ux.contract'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { FigmaHealthMetricsView } from '@/ui/figma/health/figma-health-views'

const PROCESSING_STATUSES = new Set([
	'uploaded',
	'queued',
	'processing',
	'parsed',
])

export function HealthMetricsPage() {
	const navigate = useNavigate()
	const {
		companion,
		reports,
		hasImportedReports,
		isLoading,
		isError,
		refetch,
	} = useHealthCompanion()

	const pipelineState = useMemo(() => {
		const processingCount = reports.filter((report) =>
			PROCESSING_STATUSES.has(report.status),
		).length
		const failedCount = reports.filter(
			(report) => report.status === 'failed',
		).length
		const completedWithoutMetrics = reports.filter((report) => {
			if (report.status !== 'completed') {
				return false
			}

			const parsed = getParsedHealthReport(report)

			return (parsed?.metrics.length ?? 0) === 0
		}).length

		return { processingCount, failedCount, completedWithoutMetrics }
	}, [reports])

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

	const hasMetrics =
		companion.metricGroups.length > 0 || companion.trendSeries.length > 0

	if (!hasImportedReports && reports.length === 0) {
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

	if (!hasMetrics) {
		if (pipelineState.processingCount > 0) {
			return (
				<DashboardEmptyState
					title={MODULE_UX_COPY.organizingReports.title}
					message={MODULE_UX_COPY.organizingReports.body}
					emoji="⏳"
				/>
			)
		}

		if (pipelineState.failedCount > 0) {
			return (
				<DashboardEmptyState
					title="Some reports need attention"
					message={`${pipelineState.failedCount} report${pipelineState.failedCount === 1 ? '' : 's'} could not be read clearly. Try again from Health Settings.`}
					emoji="⚠️"
					actionLabel={HEALTH_COPY.goToSetup}
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			)
		}

		return (
			<DashboardEmptyState
				title="No lab numbers yet"
				message="Your reports are here, but Chronicle needs clearer lab results to show trends. Try uploading a clearer PDF from Health Settings."
				emoji="📊"
				actionLabel={HEALTH_COPY.goToSetup}
				onAction={() => navigate(ROUTES.healthSettings)}
			/>
		)
	}

	return <FigmaHealthMetricsView companion={companion} />
}

/** @deprecated Use HealthMetricsPage */
export const HealthTrendsPage = HealthMetricsPage
