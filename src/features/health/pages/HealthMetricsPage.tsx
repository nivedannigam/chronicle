import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
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
					title="Reports are still processing"
					message={`${pipelineState.processingCount} report${pipelineState.processingCount === 1 ? '' : 's'} are being read and parsed. Metrics will appear here automatically when extraction finishes.`}
					emoji="⏳"
				/>
			)
		}

		if (pipelineState.failedCount > 0) {
			return (
				<DashboardEmptyState
					title="Some reports need attention"
					message={`${pipelineState.failedCount} report${pipelineState.failedCount === 1 ? '' : 's'} could not be parsed. Open the report to retry processing or upload a clearer PDF.`}
					emoji="⚠️"
					actionLabel="View reports"
					onAction={() => navigate(ROUTES.healthReports)}
				/>
			)
		}

		return (
			<DashboardEmptyState
				title="No lab numbers extracted yet"
				message="Your reports are imported, but Chronicle did not find structured metrics. Try reprocessing from the report detail screen, or upload a clearer lab PDF."
				emoji="📊"
				actionLabel="View reports"
				onAction={() => navigate(ROUTES.healthReports)}
			/>
		)
	}

	return <FigmaHealthMetricsView companion={companion} />
}

/** @deprecated Use HealthMetricsPage */
export const HealthTrendsPage = HealthMetricsPage
