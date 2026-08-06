import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import type { MetricCategoryId } from '@/features/health-knowledge/types'
import type {
	HealthKnowledgeGraph,
	HealthMetricHistory,
} from '@/features/health-knowledge/types'
import { getCategoryMeta } from '@/features/health-knowledge/graph/metric-categories'
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

const MIN_CLASSIFIED_FOR_SCORE = 5
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

function relativeUpdatedLabel(value: string | undefined): string | null {
	if (!value?.trim()) {
		return null
	}

	const timestamp = Date.parse(value)

	if (Number.isNaN(timestamp)) {
		return value
	}

	const diffMs = Date.now() - timestamp
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (days <= 0) {
		return 'Updated today'
	}

	if (days === 1) {
		return 'Updated yesterday'
	}

	if (days < 30) {
		return `Updated ${days} days ago`
	}

	const months = Math.floor(days / 30)

	if (months === 1) {
		return 'Updated 1 month ago'
	}

	if (months < 12) {
		return `Updated ${months} months ago`
	}

	const years = Math.floor(months / 12)

	return years === 1 ? 'Updated 1 year ago' : `Updated ${years} years ago`
}

function trendLabel(direction: string): string {
	switch (direction) {
		case 'improving':
			return 'Improving'
		case 'declining':
		case 'rapid_change':
			return 'Needs attention'
		case 'stable':
			return 'Stable'
		default:
			return 'Monitoring'
	}
}

function statusLabelForCategory(histories: HealthMetricHistory[]): string {
	if (histories.length === 0) {
		return 'Awaiting data'
	}

	const latestStatuses = histories
		.map((history) => history.observations[history.observations.length - 1])
		.filter(Boolean)

	if (latestStatuses.some((obs) => obs?.status === 'critical')) {
		return 'Needs attention'
	}

	if (
		latestStatuses.some((obs) =>
			['high', 'low', 'borderline'].includes(obs?.status ?? ''),
		)
	) {
		return 'Monitor'
	}

	if (histories.some((history) => history.trend.direction === 'improving')) {
		return 'Improving'
	}

	if (
		latestStatuses.length > 0 &&
		latestStatuses.every((obs) => obs?.status === 'normal')
	) {
		return 'Excellent'
	}

	return 'Stable'
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

function pickPrimaryHistory(
	histories: HealthMetricHistory[],
): HealthMetricHistory | undefined {
	return [...histories].sort(
		(a, b) => b.observations.length - a.observations.length,
	)[0]
}

function filterHistories(
	graph: HealthKnowledgeGraph,
	config: (typeof PROGRESS_DOMAINS)[number],
): HealthMetricHistory[] {
	let histories = graph.profile.metricHistories.filter(
		(history) => history.categoryId === config.categoryId,
	)

	if (config.metricFilter) {
		histories = histories.filter((history) =>
			config.metricFilter!.has(history.canonicalMetricId),
		)
	}

	return histories
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

function buildOverallSummary(input: {
	score: number | null
	status: HealthCompanionView['status']
	sparkline: number[]
	narrative: string[]
}): string {
	if (input.narrative[0]) {
		return input.narrative[0]
	}

	if (input.score === null) {
		return 'Your progress will appear here as more reports are added.'
	}

	if (
		input.status === 'Improving' ||
		(input.sparkline.length >= 2 &&
			input.sparkline.at(-1)! > input.sparkline[0]!)
	) {
		return 'Your overall health has improved steadily as new reports have been added.'
	}

	if (input.status === 'Looking Good') {
		return 'Your overall health looks stable and reassuring based on your latest results.'
	}

	return 'Your health picture is taking shape — keep adding reports to see richer trends.'
}

function buildDomainCards(graph: HealthKnowledgeGraph): ProgressDomainCard[] {
	return PROGRESS_DOMAINS.map((config) => {
		const histories = filterHistories(graph, config)
		const meta = getCategoryMeta(config.categoryId as MetricCategoryId)
		const primary = pickPrimaryHistory(histories)
		const sparkline = sparklineFromHistory(primary)
		const trendDirection = primary?.trend.direction ?? 'unknown'
		const lastObserved = primary?.baseline.lastObservedAt ?? undefined

		return {
			id: config.id,
			name: config.name,
			emoji: config.emoji,
			color: meta.color,
			statusLabel: statusLabelForCategory(histories),
			trendLabel: trendLabel(trendDirection),
			lastUpdated: relativeUpdatedLabel(lastObserved),
			sparkline,
			hasData: histories.length > 0,
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
}): ProgressViewModel {
	const sparkline = buildScoreSparkline(input.graph)
	const hasEnoughHistory = sparkline.length >= 2

	const overall: ProgressOverall = {
		score: input.companion.score,
		deltaLabel: buildScoreDelta(sparkline, input.companion.score),
		sparkline,
		summary: buildOverallSummary({
			score: input.companion.score,
			status: input.companion.status,
			sparkline,
			narrative: input.companion.narrative,
		}),
	}

	return {
		overall,
		domains: buildDomainCards(input.graph),
		improvements: buildImprovements(input.companion),
		watchItems: buildWatchItems(input.companion),
		milestones: buildMilestones(input.companion),
		achievements: buildAchievements(input.graph, input.companion),
		hasEnoughHistory,
	}
}
