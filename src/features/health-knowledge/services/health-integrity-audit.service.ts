import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { isReportDisplayReady } from '@/features/health/services/report-readiness.service'
import { buildHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-builder'
import { mergeHealthObservations } from '@/features/health-knowledge/services/merge-health-observations'
import { computeHealthScoreFromHistories } from '@/features/health-knowledge/services/health-scoring.service'
import { buildHealthVisitSnapshots } from '@/features/health-knowledge/services/health-snapshot.service'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

export interface HealthIntegrityAuditResult {
	reportsDiscovered: number
	reportsCompleted: number
	reportsDisplayReady: number
	reportsInKnowledge: number
	metricsExtracted: number
	metricsNormalized: number
	unknownMetrics: number
	duplicateMetricKeys: number
	snapshotsCreated: number
	timelineReportIds: string[]
	domainSummaryCount: number
	healthScore: number | null
	reports2026: string[]
	reports2026InKnowledge: string[]
	latestReportId: string | null
	warnings: string[]
}

export function runHealthIntegrityAudit(input: {
	uploadedReports: UploadedHealthReport[]
	storedMetrics?: StoredHealthMetric[]
	yearFilter?: number
}): HealthIntegrityAuditResult {
	const warnings: string[] = []
	const storedMetrics = input.storedMetrics ?? []
	const completed = input.uploadedReports.filter(
		(report) => report.status === 'completed',
	)
	const displayReady = input.uploadedReports.filter(isReportDisplayReady)

	const merged = mergeHealthObservations({
		storedMetrics,
		uploadedReports: input.uploadedReports,
	})

	const graph = buildHealthKnowledgeGraph({
		personId: 'audit',
		uploadedReports: input.uploadedReports,
		storedMetrics,
	})

	const snapshots = buildHealthVisitSnapshots({
		graph,
		reports: input.uploadedReports,
	})

	let metricsExtracted = 0
	let metricsNormalized = 0
	let unknownMetrics = 0

	for (const report of completed) {
		const parsed = getParsedHealthReport(report)
		metricsExtracted += parsed?.metrics.length ?? 0
	}

	for (const observation of merged) {
		if (
			observation.canonicalMetricId.startsWith('unknown-') ||
			observation.canonicalMetricId.startsWith('raw:')
		) {
			unknownMetrics += 1
			continue
		}

		metricsNormalized += 1
	}

	const seen = new Set<string>()
	let duplicateMetricKeys = 0

	for (const observation of merged) {
		const key = `${observation.reportId}:${observation.canonicalMetricId}:${observation.observedAt}`

		if (seen.has(key)) {
			duplicateMetricKeys += 1
		}

		seen.add(key)
	}

	const yearFilter = input.yearFilter ?? new Date().getFullYear()
	const reports2026 = completed
		.filter((report) => {
			const date =
				report.report_date ?? report.processed_at ?? report.uploaded_at ?? ''

			return date.startsWith(String(yearFilter))
		})
		.map((report) => report.id)

	const reports2026InKnowledge = reports2026.filter((reportId) =>
		graph.profile.reportIds.includes(reportId),
	)

	if (reports2026.length > reports2026InKnowledge.length) {
		warnings.push(
			`${reports2026.length - reports2026InKnowledge.length} ${yearFilter} report(s) missing from HealthKnowledge`,
		)
	}

	if (storedMetrics.length > 0 && merged.length <= storedMetrics.length) {
		warnings.push(
			'Parsed metrics may not be merged — observation count equals stored-only baseline',
		)
	}

	const latestReportId = snapshots[0]?.reportId ?? null

	return {
		reportsDiscovered: input.uploadedReports.length,
		reportsCompleted: completed.length,
		reportsDisplayReady: displayReady.length,
		reportsInKnowledge: graph.profile.reportIds.length,
		metricsExtracted,
		metricsNormalized,
		unknownMetrics,
		duplicateMetricKeys,
		snapshotsCreated: snapshots.length,
		timelineReportIds: graph.profile.reportIds,
		domainSummaryCount: snapshots.flatMap(
			(snapshot) => snapshot.domainSummaries,
		).length,
		healthScore: computeHealthScoreFromHistories(graph.profile.metricHistories),
		reports2026,
		reports2026InKnowledge,
		latestReportId,
		warnings,
	}
}
