import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { TrendSeries } from '@/features/health/types'
import type { HealthCanonicalSnapshot } from '@/features/health/types/health-context.types'
import { buildProductReportCards } from '@/features/health/services/health-product.mapper'
import { buildHealthVisits } from '@/features/health/services/health-visit.mapper'
import { buildHealthProgressViewModel } from '@/features/health/services/health-progress.mapper'
import { buildHealthStoryViewModel } from '@/features/health/services/health-story.mapper'
import {
	buildCanonicalHealthScore,
	consumerOverallSummary,
	deriveConsumerOverallStatus,
	deriveConsumerTrendLabel,
} from '@/features/health/services/health-consumer-status.service'
import { getReportDisplayDate } from '@/features/health/services/health-parsed-report.service'
import { buildHealthVisitSnapshots } from '@/features/health-knowledge/services/health-snapshot.service'
import { buildVisitChangesMap } from '@/features/health/services/health-visit-changes.service'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'

export function buildCanonicalSnapshot(input: {
	companion: HealthCompanionView
	graph: HealthKnowledgeGraph
	visits: HealthVisit[]
}): HealthCanonicalSnapshot {
	const score = buildCanonicalHealthScore(input.graph)
	const overallStatus = deriveConsumerOverallStatus({
		companion: input.companion,
		score,
	})
	const trendLabel = deriveConsumerTrendLabel({
		companion: input.companion,
		score,
	})

	const latestReport = input.companion.recentReports[0] ?? null
	const latestVisit = input.visits[0] ?? null
	const topStep = input.companion.nextSteps.find(
		(step) => step.id !== 'review-imports',
	)

	return {
		score,
		overallStatus,
		overallSummary: consumerOverallSummary(overallStatus),
		trendLabel,
		latestReportTitle: latestReport?.title ?? null,
		latestReportDate: latestReport?.displayDate ?? null,
		latestVisitTitle: latestVisit?.title ?? null,
		latestVisitDate: latestVisit?.displayDate ?? null,
		topRecommendationTitle: topStep?.title ?? null,
		topRecommendationPath: topStep?.actionPath ?? null,
	}
}

export function buildHealthContextValue(input: {
	companion: HealthCompanionView
	graph: HealthKnowledgeGraph
	coverage: HealthCoverageSnapshot
	reports: UploadedHealthReport[]
	trendSeries: TrendSeries[]
	hasImportedReports: boolean
	memberName: string | null
	storedMetrics?: StoredHealthMetric[]
	isLoading: boolean
	isError: boolean
	refetch: () => void
}) {
	const visits = buildHealthVisits(input.reports)
	const reportCards = buildProductReportCards(input.reports)
	const snapshot = buildCanonicalSnapshot({
		companion: input.companion,
		graph: input.graph,
		visits,
	})
	const story = buildHealthStoryViewModel({
		companion: input.companion,
		memberName: input.memberName,
		hasReports: input.hasImportedReports,
		reportCount: input.companion.profile?.reportCount ?? input.reports.length,
		visits,
		snapshot,
	})
	const progress = buildHealthProgressViewModel({
		companion: input.companion,
		graph: input.graph,
		trendSeries: input.trendSeries,
		snapshot,
	})
	const visitSnapshots = buildHealthVisitSnapshots({
		graph: input.graph,
		reports: input.reports,
	})
	const visitChanges = buildVisitChangesMap(visits, input.graph)

	return {
		reports: input.reports,
		visits,
		reportCards,
		companion: input.companion,
		graph: input.graph,
		coverage: input.coverage,
		snapshot,
		story,
		progress,
		visitSnapshots,
		visitChanges,
		storedMetrics: input.storedMetrics ?? [],
		hasImportedReports: input.hasImportedReports,
		isLoading: input.isLoading,
		isError: input.isError,
		refetch: input.refetch,
	}
}

export function formatLatestReportDate(report: UploadedHealthReport): string {
	const date = getReportDisplayDate(report)
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}
