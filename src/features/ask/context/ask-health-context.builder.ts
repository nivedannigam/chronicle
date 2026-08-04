import {
	rankEvidence,
	selectImportantMetrics,
} from '@/features/ask/clinical/evidence-ranking.engine'
import type { AskHealthContext } from '@/features/ask/context/ask-health-context.types'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

function normalizeValue(value: string): string {
	return value
		.trim()
		.split(/\s+/)
		.filter(
			(part, index, array) =>
				index === 0 || part.toLowerCase() !== array[index - 1]?.toLowerCase(),
		)
		.join(' ')
}

function formatMetricValue(metric: {
	latestValue: string
	unit?: string | null
}): string {
	const value = normalizeValue(metric.latestValue)
	return metric.unit ? `${value} ${metric.unit}`.trim() : value
}

function buildRecentChanges(knowledge: RetrievedKnowledge) {
	const changes: AskHealthContext['recentChanges'] = []

	for (const trend of knowledge.trends.slice(0, 6)) {
		changes.push({
			metricName: trend.displayName,
			fromValue: '—',
			toValue: trend.latestValue,
			fromDate: '',
			toDate: '',
			direction:
				trend.direction === 'improving'
					? 'down'
					: trend.direction === 'declining'
						? 'up'
						: trend.direction === 'stable'
							? 'stable'
							: 'unknown',
		})
	}

	for (const comparison of knowledge.comparisons.slice(0, 4)) {
		for (const metric of comparison.metrics.slice(0, 2)) {
			changes.push({
				metricName: metric.metric,
				fromValue: metric.oldValue,
				toValue: metric.newValue,
				fromDate: comparison.olderLabel,
				toDate: comparison.newerLabel,
				direction: 'unknown',
			})
		}
	}

	return changes
}

/** Builds structured health context only — no prose. */
export function buildAskHealthContext(input: {
	knowledge: RetrievedKnowledge
	coverage?: HealthCoverageSnapshot | null
	dataAvailable: boolean
}): AskHealthContext {
	const ranked = rankEvidence(input.knowledge)
	const important = selectImportantMetrics(ranked, 8)

	const reports = ranked.reports.map((report) => ({
		id: report.id,
		title: report.title,
		date: report.date,
		lab: report.lab,
	}))

	const latestReport = reports[0] ?? null

	const importantMetrics = important.map((metric) => ({
		id: metric.canonicalId,
		displayName: metric.displayName,
		value: formatMetricValue(metric),
		unit: metric.unit ?? undefined,
		status: metric.status,
		observedAt: metric.observedAt,
		reportId: metric.reportId,
		reportTitle: metric.reportTitle,
	}))

	const abnormalFindings = ranked.metrics
		.filter(
			(metric) =>
				metric.status === 'low' ||
				metric.status === 'high' ||
				metric.status === 'critical' ||
				metric.status === 'borderline',
		)
		.slice(0, 10)
		.map((metric) => ({
			id: metric.canonicalId,
			displayName: metric.displayName,
			value: formatMetricValue(metric),
			unit: metric.unit ?? undefined,
			status: metric.status,
			observedAt: metric.observedAt,
			reportId: metric.reportId,
			reportTitle: metric.reportTitle,
		}))

	const timeline = [
		...(input.knowledge.semanticTimeline ?? []).flatMap((group) =>
			group.events.slice(0, 3).map((event) => `${group.year}: ${event.label}`),
		),
		...input.knowledge.summaryLines.slice(0, 4),
	].slice(0, 8)

	const evidence = important.slice(0, 12).map((metric, index) => ({
		id: `metric-${metric.canonicalId}-${index}`,
		reportId: metric.reportId ?? '',
		reportTitle: metric.reportTitle ?? 'Health report',
		reportDate: metric.observedAt.slice(0, 10),
		metricName: metric.displayName,
		metricValue: formatMetricValue(metric),
	}))

	return {
		healthSummary: {
			reportCount: ranked.reportCount,
			metricCount: ranked.metrics.length,
			abnormalCount: ranked.abnormalCount,
			hasMultipleReports: !ranked.singleReport,
		},
		latestReport,
		reportHistory: reports,
		importantMetrics,
		abnormalFindings,
		recentChanges: buildRecentChanges(input.knowledge),
		timeline,
		evidence,
		internal: {
			dataAvailable: input.dataAvailable,
			corpusCompleteness: input.coverage?.corpusCompleteness,
		},
		rawKnowledge: input.knowledge,
		rankedImportant: important,
	}
}
