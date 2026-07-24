import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { HealthSummaryStats } from '@/features/health/components/dashboard/HealthSummaryBar'
import type { UploadedHealthReport } from '@/features/health/types'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'

import {
	queryKeys,
	STALE_TIME,
	healthDashboardSummaryQueryKey,
} from '@/lib/query-keys'

export { healthDashboardSummaryQueryKey }

async function fetchLastScanAt(userId: string): Promise<string | null> {
	const { data } = await supabase
		.from('health_discovery_runs')
		.select('completed_at, started_at')
		.eq('user_id', userId)
		.order('started_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	return (
		(data?.completed_at as string | null) ??
		(data?.started_at as string | null) ??
		null
	)
}

export function buildHealthSummaryStats(input: {
	userId: string | undefined
	uploadedReports: UploadedHealthReport[]
	graph: HealthKnowledgeGraph
	lastScanAt: string | null
}): HealthSummaryStats {
	const completed = input.uploadedReports.filter(
		(report) => report.status === 'completed',
	)
	const hasImportedReports = completed.length > 0
	const latest = [...completed].sort(
		(a, b) =>
			Date.parse(b.report_date ?? b.uploaded_at) -
			Date.parse(a.report_date ?? a.uploaded_at),
	)[0]
	const latestParsed = latest ? getParsedHealthReport(latest) : null

	const metricsExtracted = hasImportedReports
		? input.graph.profile.metricHistories.length
		: 0

	let normalCount = 0
	let totalWithStatus = 0

	if (hasImportedReports) {
		for (const history of input.graph.profile.metricHistories) {
			const latestObs = history.observations[history.observations.length - 1]

			if (latestObs?.status) {
				totalWithStatus += 1

				if (latestObs.status === 'normal') {
					normalCount += 1
				}
			}
		}
	}

	const timelineEntries = hasImportedReports
		? input.graph.profile.metricHistories.reduce(
				(sum, history) => sum + history.observations.length,
				0,
			)
		: 0

	const healthScore =
		hasImportedReports && totalWithStatus > 0
			? Math.round((normalCount / totalWithStatus) * 100)
			: null

	return {
		lastScanAt: input.lastScanAt,
		reportsImported: completed.length,
		latestReportTitle: latest ? getReportDisplayTitle(latest) : null,
		latestReportDate: latest
			? new Date(getReportDisplayDate(latest, latestParsed)).toLocaleDateString(
					'en-US',
					{
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					},
				)
			: null,
		healthScore,
		metricsExtracted,
		timelineEntries,
		hasImportedReports,
	}
}

export function useHealthDashboardSummary(
	userId: string | undefined,
	uploadedReports: UploadedHealthReport[],
	graph: HealthKnowledgeGraph,
) {
	const lastScanQuery = useQuery({
		queryKey: queryKeys.health.dashboard(userId),
		queryFn: () => fetchLastScanAt(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.healthDashboard,
	})

	return buildHealthSummaryStats({
		userId,
		uploadedReports,
		graph,
		lastScanAt: lastScanQuery.data ?? null,
	})
}
