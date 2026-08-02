import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEALTH_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { InlineErrorBanner } from '@/components/common/InlineErrorBanner'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { FigmaHealthInsightsView } from '@/ui/figma/health/figma-health-views'

const PROCESSING_STATUSES = new Set([
	'uploaded',
	'queued',
	'processing',
	'parsed',
])

export function HealthInsightsPage() {
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
		const hasExtractedMetrics = reports.some((report) => {
			if (report.status !== 'completed') {
				return false
			}

			return (getParsedHealthReport(report)?.metrics.length ?? 0) > 0
		})

		return { processingCount, hasExtractedMetrics }
	}, [reports])

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

	if (companion.insightGroups.length > 0) {
		return <FigmaHealthInsightsView groups={companion.insightGroups} />
	}

	if (!hasImportedReports && reports.length === 0) {
		return (
			<DashboardEmptyState
				title="Insights will appear here"
				message="Chronicle turns your lab results into plain-language guidance once reports are added."
				emoji="✨"
				actionLabel={HEALTH_COPY.emptyAddReports}
				onAction={() => navigate(ROUTES.healthSettings)}
			/>
		)
	}

	if (pipelineState.processingCount > 0) {
		return (
			<DashboardEmptyState
				title="Insights are on the way"
				message="Reports are still being parsed. Guidance will appear here once lab numbers are extracted."
				emoji="⏳"
			/>
		)
	}

	if (!pipelineState.hasExtractedMetrics) {
		return (
			<DashboardEmptyState
				title="No insights yet"
				message="Your reports are imported, but Chronicle needs structured lab numbers to generate guidance. Try reprocessing from Health Setup."
				emoji="✨"
				actionLabel={HEALTH_COPY.goToSetup}
				onAction={() => navigate(ROUTES.healthSettings)}
			/>
		)
	}

	return (
		<DashboardEmptyState
			title="Insights will appear here"
			message="Add more reports over time so Chronicle can spot trends and changes worth noting."
			emoji="✨"
		/>
	)
}
