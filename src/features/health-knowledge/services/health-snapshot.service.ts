import {
	computeHealthScoreFromHistories,
	domainStatusLabel,
} from '@/features/health-knowledge/services/health-scoring.service'
import type {
	HealthKnowledgeGraph,
	HealthMetricHistory,
	HealthObservation,
} from '@/features/health-knowledge/types'
import type { UploadedHealthReport } from '@/features/health/types'
import { getReportDisplayDate } from '@/features/health/services/health-parsed-report.service'

export interface HealthDomainSummary {
	categoryId: string
	statusLabel: string
	metricCount: number
	latestObservedAt: string | null
}

export interface HealthVisitSnapshot {
	reportId: string
	visitDate: string
	displayDate: string
	overallStatus: string
	domainSummaries: HealthDomainSummary[]
	importantFindings: string[]
	majorMetrics: Array<{
		canonicalMetricId: string
		displayName: string
		value: string
		status: string
	}>
	healthScore: number | null
	timelineEventKind: 'checkup' | 'finding' | 'improvement'
}

const IMPORTANT_STATUSES = new Set(['low', 'high', 'critical', 'borderline'])

function observationsForReport(
	graph: HealthKnowledgeGraph,
	reportId: string,
): HealthObservation[] {
	return graph.profile.metricHistories.flatMap((history) =>
		history.observations.filter(
			(observation) => observation.reportId === reportId,
		),
	)
}

function historiesForReport(
	graph: HealthKnowledgeGraph,
	reportId: string,
): HealthMetricHistory[] {
	return graph.profile.metricHistories
		.map((history) => ({
			...history,
			observations: history.observations.filter(
				(observation) => observation.reportId === reportId,
			),
		}))
		.filter((history) => history.observations.length > 0)
}

function buildDomainSummaries(
	histories: HealthMetricHistory[],
): HealthDomainSummary[] {
	const byCategory = new Map<string, HealthMetricHistory[]>()

	for (const history of histories) {
		const existing = byCategory.get(history.categoryId) ?? []
		existing.push(history)
		byCategory.set(history.categoryId, existing)
	}

	return [...byCategory.entries()].map(([categoryId, categoryHistories]) => ({
		categoryId,
		statusLabel: domainStatusLabel(categoryHistories),
		metricCount: categoryHistories.length,
		latestObservedAt:
			categoryHistories
				.map((history) => history.baseline.lastObservedAt)
				.filter(Boolean)
				.sort((a, b) => Date.parse(b!) - Date.parse(a!))[0] ?? null,
	}))
}

function buildImportantFindings(observations: HealthObservation[]): string[] {
	return observations
		.filter((observation) => IMPORTANT_STATUSES.has(observation.status))
		.map(
			(observation) =>
				`${observation.displayName} ${observation.status} (${observation.value}${observation.unit ? ` ${observation.unit}` : ''})`,
		)
		.slice(0, 6)
}

function buildMajorMetrics(observations: HealthObservation[]) {
	return observations
		.filter((observation) => observation.status !== 'unknown')
		.slice(0, 12)
		.map((observation) => ({
			canonicalMetricId: observation.canonicalMetricId,
			displayName: observation.displayName,
			value: observation.value,
			status: observation.status,
		}))
}

function resolveOverallStatus(
	findings: string[],
	score: number | null,
): string {
	if (findings.some((finding) => finding.includes('critical'))) {
		return 'Needs attention'
	}

	if (findings.length >= 2) {
		return 'Monitor'
	}

	if (findings.length === 1) {
		return 'Monitor'
	}

	if (score != null && score >= 85) {
		return 'Looking good'
	}

	if (score != null) {
		return 'Stable'
	}

	return 'Recorded'
}

/** One canonical snapshot per completed report for consumers (History, Progress, Ask). */
export function buildHealthVisitSnapshots(input: {
	graph: HealthKnowledgeGraph
	reports: UploadedHealthReport[]
}): HealthVisitSnapshot[] {
	const completed = input.reports.filter(
		(report) => report.status === 'completed',
	)

	return completed
		.map((report) => {
			const observations = observationsForReport(input.graph, report.id)
			const histories = historiesForReport(input.graph, report.id)
			const findings = buildImportantFindings(observations)
			const score = computeHealthScoreFromHistories(histories)
			const visitDate =
				getReportDisplayDate(report) ??
				report.report_date ??
				report.processed_at ??
				report.uploaded_at

			return {
				reportId: report.id,
				visitDate,
				displayDate: new Date(visitDate).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				}),
				overallStatus: resolveOverallStatus(findings, score),
				domainSummaries: buildDomainSummaries(histories),
				importantFindings: findings,
				majorMetrics: buildMajorMetrics(observations),
				healthScore: score,
				timelineEventKind: (findings.length > 0
					? 'finding'
					: score != null && score >= 90
						? 'improvement'
						: 'checkup') as HealthVisitSnapshot['timelineEventKind'],
			}
		})
		.sort(
			(a, b) =>
				new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
		)
}
