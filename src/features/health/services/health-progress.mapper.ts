import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { MetricCategoryId } from '@/features/health-knowledge/types'
import type {
	HealthKnowledgeGraph,
	HealthMetricHistory,
} from '@/features/health-knowledge/types'
import { getCategoryMeta } from '@/features/health-knowledge/graph/metric-categories'
import {
	consumerDomainStatus,
	consumerDomainTrendLabel,
	newestObservationDate,
	relativeConsumerUpdatedLabel,
} from '@/features/health/services/health-consumer-status.service'
import {
	filterHistoriesByCategory,
	MIN_CLASSIFIED_FOR_SCORE,
	pickMostRecentHistory,
} from '@/features/health-knowledge/services/health-scoring.service'
import { getReportDisplayDate } from '@/features/health/services/health-parsed-report.service'
import type { HealthCanonicalSnapshot } from '@/features/health/types/health-context.types'
import type {
	ProgressAchievement,
	ProgressDomainCard,
	ProgressHighlight,
	ProgressMilestone,
	ProgressOverall,
	ProgressViewModel,
	ProgressWatchItem,
} from '@/features/progress/types/progress.types'
import type { TrendSeries } from '@/features/health/types'

const LIPID_METRIC_IDS = new Set([
	'ldl',
	'hdl',
	'total-cholesterol',
	'triglycerides',
])
const WEIGHT_METRIC_IDS = new Set(['weight', 'bmi'])

const PROGRESS_DOMAINS: Array<{
	id: string
	name: string
	emoji: string
	categoryId: string
	metricFilter?: Set<string>
}> = [
	{ id: 'heart', name: 'Heart', emoji: '❤️', categoryId: 'heart' },
	{
		id: 'blood-sugar',
		name: 'Blood Sugar',
		emoji: '🩸',
		categoryId: 'diabetes',
	},
	{ id: 'liver', name: 'Liver', emoji: '🫀', categoryId: 'liver' },
	{ id: 'kidney', name: 'Kidney', emoji: '💧', categoryId: 'kidney' },
	{ id: 'thyroid', name: 'Thyroid', emoji: '🧬', categoryId: 'thyroid' },
	{
		id: 'cholesterol',
		name: 'Cholesterol',
		emoji: '🧪',
		categoryId: 'heart',
		metricFilter: LIPID_METRIC_IDS,
	},
	{ id: 'vitamins', name: 'Vitamins', emoji: '🩺', categoryId: 'vitamin' },
	{
		id: 'weight',
		name: 'Weight',
		emoji: '⚖️',
		categoryId: 'blood',
		metricFilter: WEIGHT_METRIC_IDS,
	},
]

function filterHistories(
	graph: HealthKnowledgeGraph,
	config: (typeof PROGRESS_DOMAINS)[number],
): HealthMetricHistory[] {
	return filterHistoriesByCategory(
		graph.profile.metricHistories,
		config.categoryId as MetricCategoryId,
		config.metricFilter,
	)
}

function sparklineFromHistory(
	history: HealthMetricHistory | undefined,
): number[] {
	if (!history) {
		return []
	}

	const values = history.observations
		.map((observation) => observation.numericValue)
		.filter((value): value is number => typeof value === 'number')

	return values.length >= 2 ? values : []
}

function buildScoreSparkline(graph: HealthKnowledgeGraph): number[] {
	const dates = [
		...new Set(
			graph.profile.metricHistories.flatMap((history) =>
				history.observations.map((observation) =>
					observation.observedAt.slice(0, 10),
				),
			),
		),
	].sort()

	const points: number[] = []

	for (const date of dates) {
		let normalCount = 0
		let classifiedCount = 0

		for (const history of graph.profile.metricHistories) {
			const latest = [...history.observations]
				.filter((observation) => observation.observedAt.slice(0, 10) <= date)
				.pop()

			if (!latest?.status || latest.status === 'unknown') {
				continue
			}

			classifiedCount += 1

			if (latest.status === 'normal') {
				normalCount += 1
			}
		}

		if (classifiedCount >= MIN_CLASSIFIED_FOR_SCORE) {
			points.push(Math.round((normalCount / classifiedCount) * 100))
		}
	}

	return points.length >= 2 ? points : []
}

function buildScoreDelta(
	sparkline: number[],
	currentScore: number | null,
): string | null {
	if (sparkline.length < 2 || currentScore === null) {
		return null
	}

	const earliest = sparkline[0]!
	const delta = currentScore - earliest

	if (delta === 0) {
		return 'Steady over time'
	}

	const sign = delta > 0 ? '+' : ''
	const yearSpan =
		sparkline.length >= 6 ? ' over recent checkups' : ' since earlier reports'

	return `${sign}${delta}${yearSpan}`
}

function completedReportIds(reports: UploadedHealthReport[]): Set<string> {
	return new Set(
		reports
			.filter((report) => report.status === 'completed')
			.map((report) => report.id),
	)
}

function scopeHistoriesToReports(
	histories: HealthMetricHistory[],
	reportIds: Set<string>,
): HealthMetricHistory[] {
	return histories
		.map((history) => ({
			...history,
			observations: history.observations.filter((observation) =>
				reportIds.has(observation.reportId),
			),
		}))
		.filter((history) => history.observations.length > 0)
}

function reportIdsForYear(
	reports: UploadedHealthReport[],
	year: number,
	completedIds: Set<string>,
): Set<string> {
	const prefix = `${year}-`

	return new Set(
		reports
			.filter(
				(report) =>
					completedIds.has(report.id) &&
					getReportDisplayDate(report).startsWith(prefix),
			)
			.map((report) => report.id),
	)
}

function resolveDomainHistories(input: {
	graph: HealthKnowledgeGraph
	config: (typeof PROGRESS_DOMAINS)[number]
	visits: HealthVisit[]
	reports: UploadedHealthReport[]
}): {
	histories: HealthMetricHistory[]
	anchorDate: string | undefined
} {
	const allHistories = filterHistories(input.graph, input.config)
	const completedIds = completedReportIds(input.reports)
	const scopes: Array<Set<string>> = []

	for (const visit of input.visits) {
		const visitReportIds = visit.reportIds.filter((reportId) =>
			completedIds.has(reportId),
		)

		if (visitReportIds.length > 0) {
			scopes.push(new Set(visitReportIds))
		}
	}

	const currentYear = new Date().getFullYear()
	const yearReportIds = reportIdsForYear(
		input.reports,
		currentYear,
		completedIds,
	)

	if (yearReportIds.size > 0) {
		scopes.push(yearReportIds)
	}

	for (const reportIds of scopes) {
		const scoped = scopeHistoriesToReports(allHistories, reportIds)

		if (scoped.length === 0) {
			continue
		}

		const anchorDate =
			[...reportIds]
				.map((reportId) => {
					const report = input.reports.find((entry) => entry.id === reportId)

					return report ? getReportDisplayDate(report) : undefined
				})
				.filter(Boolean)
				.sort((a, b) => Date.parse(b!) - Date.parse(a!))[0] ??
			newestObservationDate(scoped)

		return { histories: scoped, anchorDate }
	}

	return { histories: [], anchorDate: undefined }
}

function buildDomainCards(input: {
	graph: HealthKnowledgeGraph
	visits: HealthVisit[]
	reports: UploadedHealthReport[]
}): ProgressDomainCard[] {
	return PROGRESS_DOMAINS.map((config) => {
		const allHistories = filterHistories(input.graph, config)
		const { histories, anchorDate } = resolveDomainHistories({
			graph: input.graph,
			config,
			visits: input.visits,
			reports: input.reports,
		})
		const meta = getCategoryMeta(config.categoryId as MetricCategoryId)
		const primary = pickMostRecentHistory(allHistories)
		const sparkline = sparklineFromHistory(primary)
		const domainStatus =
			histories.length > 0 ? consumerDomainStatus(histories) : 'No Recent Data'

		return {
			id: config.id,
			name: config.name,
			emoji: config.emoji,
			color: meta.color,
			statusLabel: domainStatus,
			trendLabel:
				histories.length > 0 ? consumerDomainTrendLabel(histories) : '—',
			lastUpdated: relativeConsumerUpdatedLabel(anchorDate),
			sparkline,
			hasData: domainStatus !== 'No Recent Data',
			categoryId: config.categoryId,
		}
	})
}

function buildImprovements(
	companion: HealthCompanionView,
): ProgressHighlight[] {
	const items: ProgressHighlight[] = []

	for (const change of companion.changes) {
		if (change.direction === 'improved' || change.direction === 'resolved') {
			items.push({
				id: change.id,
				label: change.label,
				tone: 'positive',
			})
		} else if (change.direction === 'stable') {
			items.push({
				id: change.id,
				label: change.label.includes('stable')
					? change.label
					: `${change.label} stable`,
				tone: 'neutral',
			})
		}
	}

	for (const highlight of companion.trendHighlights) {
		if (highlight.status !== 'improving') {
			continue
		}

		if (items.some((item) => item.label === highlight.label)) {
			continue
		}

		items.push({
			id: highlight.id,
			label: highlight.label,
			tone: 'positive',
		})
	}

	return items.slice(0, 6)
}

function buildWatchItems(companion: HealthCompanionView): ProgressWatchItem[] {
	const items: ProgressWatchItem[] = []

	for (const item of companion.attention) {
		if (item.id === 'review-pending') {
			continue
		}

		items.push({
			id: item.id,
			label: item.title,
		})
	}

	for (const step of companion.nextSteps) {
		if (step.id === 'review-imports') {
			continue
		}

		if (items.some((item) => item.label === step.title)) {
			continue
		}

		items.push({
			id: step.id,
			label: step.title,
		})
	}

	return items.slice(0, 4)
}

function buildMilestones(companion: HealthCompanionView): ProgressMilestone[] {
	return companion.journeyEvents.slice(0, 5).map((event) => ({
		id: event.id,
		title: event.title,
		date: event.date,
		displayDate: event.displayDate,
		kind: event.kind,
	}))
}

function buildAchievements(
	graph: HealthKnowledgeGraph,
	companion: HealthCompanionView,
): ProgressAchievement[] {
	const achievements: ProgressAchievement[] = []

	for (const history of graph.profile.metricHistories) {
		if (
			history.trend.direction !== 'improving' ||
			history.observations.length < 2
		) {
			continue
		}

		achievements.push({
			id: `achievement-improving-${history.canonicalMetricId}`,
			title: `${history.displayName} trending better`,
			emoji: '✨',
		})
	}

	const ldl = graph.profile.metricHistories.find(
		(history) => history.canonicalMetricId === 'ldl',
	)
	const latestLdl = ldl?.observations[ldl.observations.length - 1]

	if (latestLdl?.status === 'normal') {
		achievements.push({
			id: 'achievement-cholesterol',
			title: 'Cholesterol in a healthy range',
			emoji: '💚',
		})
	}

	const hba1c = graph.profile.metricHistories.find(
		(history) => history.canonicalMetricId === 'hba1c',
	)
	const latestHba1c = hba1c?.observations[hba1c.observations.length - 1]

	if (
		latestHba1c?.status === 'normal' ||
		latestHba1c?.status === 'borderline'
	) {
		achievements.push({
			id: 'achievement-blood-sugar',
			title: 'Blood sugar well controlled',
			emoji: '🎯',
		})
	}

	if (companion.status === 'Looking Good' || companion.status === 'Improving') {
		achievements.push({
			id: 'achievement-overall',
			title: 'Overall health on track',
			emoji: '🌿',
		})
	}

	const unique = new Map<string, ProgressAchievement>()

	for (const item of achievements) {
		unique.set(item.id, item)
	}

	return [...unique.values()].slice(0, 5)
}

export function buildHealthProgressViewModel(input: {
	companion: HealthCompanionView
	graph: HealthKnowledgeGraph
	trendSeries?: TrendSeries[]
	snapshot: HealthCanonicalSnapshot
	visits: HealthVisit[]
	reports: UploadedHealthReport[]
}): ProgressViewModel {
	const sparkline = buildScoreSparkline(input.graph)
	const hasEnoughHistory = sparkline.length >= 2

	const overall: ProgressOverall = {
		score: input.snapshot.score,
		deltaLabel: buildScoreDelta(sparkline, input.snapshot.score),
		sparkline,
		summary: input.snapshot.overallSummary,
		statusLabel: input.snapshot.overallStatus,
		trendLabel: input.snapshot.trendLabel,
	}

	return {
		overall,
		domains: buildDomainCards({
			graph: input.graph,
			visits: input.visits,
			reports: input.reports,
		}),
		improvements: buildImprovements(input.companion),
		watchItems: buildWatchItems(input.companion),
		milestones: buildMilestones(input.companion),
		achievements: buildAchievements(input.graph, input.companion),
		hasEnoughHistory,
	}
}
