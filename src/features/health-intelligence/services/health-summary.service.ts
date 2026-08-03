import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { ChronicleInsight } from '@/features/health-insights/types/health-insights.types'
import type {
	HealthSummary,
	LongitudinalHealthProfile,
} from '@/features/health-intelligence/types/health-profile.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

function topAbnormalMetricNames(
	graph: HealthKnowledgeGraph,
	limit = 2,
): string[] {
	const names: string[] = []

	for (const history of graph.profile.metricHistories) {
		const latest = history.observations[history.observations.length - 1]

		if (latest && ABNORMAL.has(latest.status)) {
			names.push(history.displayName)
		}

		if (names.length >= limit) {
			break
		}
	}

	return names
}

export function buildHealthSummary(input: {
	graph: HealthKnowledgeGraph
	profile: LongitudinalHealthProfile
	insights: ChronicleInsight[]
	statusLabel: string
}): HealthSummary {
	const histories = input.graph.profile.metricHistories
	let metricsNeedingAttention = 0
	let improvingCount = 0
	let stableCount = 0
	let newFindingsCount = 0

	for (const history of histories) {
		const latest = history.observations[history.observations.length - 1]

		if (latest && ABNORMAL.has(latest.status)) {
			metricsNeedingAttention += 1
		}

		if (history.trend.direction === 'improving') {
			improvingCount += 1
		}

		if (history.trend.direction === 'stable') {
			stableCount += 1
		}
	}

	newFindingsCount = input.insights.filter(
		(item) =>
			item.category === 'recently_changed' &&
			item.title.toLowerCase().includes('new'),
	).length

	let overallStatus: HealthSummary['overallStatus'] = 'stable'

	if (metricsNeedingAttention >= 3 || input.statusLabel === 'Needs Attention') {
		overallStatus = 'needs_attention'
	} else if (improvingCount > metricsNeedingAttention && improvingCount > 0) {
		overallStatus = 'improving'
	} else if (metricsNeedingAttention > 0 && improvingCount > 0) {
		overallStatus = 'mixed'
	}

	const headline = buildHeadline({
		overallStatus,
		metricsNeedingAttention,
		newFindingsCount,
		reportCount: input.profile.reportCount,
		topAbnormalMetrics: topAbnormalMetricNames(input.graph),
		coveragePartial: input.statusLabel === 'Partial Results',
	})

	const bullets = buildBullets({
		overallStatus,
		metricsNeedingAttention,
		improvingCount,
		stableCount,
		newFindingsCount,
		insights: input.insights,
		reportCount: input.profile.reportCount,
		topAbnormalMetrics: topAbnormalMetricNames(input.graph, 3),
		coveragePartial: input.statusLabel === 'Partial Results',
	})

	return {
		headline,
		bullets,
		overallStatus,
		metricsNeedingAttention,
		improvingCount,
		stableCount,
		newFindingsCount,
	}
}

function buildHeadline(input: {
	overallStatus: HealthSummary['overallStatus']
	metricsNeedingAttention: number
	newFindingsCount: number
	reportCount: number
	topAbnormalMetrics: string[]
	coveragePartial: boolean
}): string {
	if (input.reportCount === 0) {
		return 'Import health reports to build your health record.'
	}

	if (input.coveragePartial) {
		return 'Your health picture is incomplete — some reports still need reprocessing in Setup.'
	}

	if (
		input.metricsNeedingAttention > 0 &&
		input.topAbnormalMetrics.length > 0
	) {
		const focus = input.topAbnormalMetrics.slice(0, 2).join(' and ')
		return `${focus} ${input.metricsNeedingAttention === 1 ? 'needs' : 'need'} attention in your latest labs.`
	}

	switch (input.overallStatus) {
		case 'needs_attention':
			return input.newFindingsCount > 0
				? 'Some areas need attention — including new findings in your latest reports.'
				: `${input.metricsNeedingAttention} metric${input.metricsNeedingAttention === 1 ? '' : 's'} need attention.`
		case 'improving':
			return 'Overall health is improving across your recent reports.'
		case 'mixed':
			return 'Mixed picture — some markers improving, others need monitoring.'
		default:
			return 'Overall health is stable based on your imported reports.'
	}
}

function buildBullets(input: {
	overallStatus: HealthSummary['overallStatus']
	metricsNeedingAttention: number
	improvingCount: number
	stableCount: number
	newFindingsCount: number
	insights: ChronicleInsight[]
	reportCount: number
	topAbnormalMetrics: string[]
	coveragePartial: boolean
}): string[] {
	const bullets: string[] = []

	if (input.reportCount === 0) {
		return ['No reports imported yet.']
	}

	if (input.coveragePartial) {
		bullets.push(
			'Some imported reports are only partially extracted — open Setup → Reports to reprocess.',
		)
	}

	if (input.topAbnormalMetrics.length > 0) {
		bullets.push(
			`Watch ${input.topAbnormalMetrics.join(', ')} based on your most recent results.`,
		)
	}

	if (input.overallStatus === 'stable') {
		bullets.push(
			'No significant deterioration detected across tracked markers.',
		)
	}

	if (input.metricsNeedingAttention > 0) {
		bullets.push(
			`${input.metricsNeedingAttention} metric${input.metricsNeedingAttention === 1 ? '' : 's'} need attention.`,
		)
	}

	if (input.improvingCount > 0) {
		bullets.push(
			`${input.improvingCount} area${input.improvingCount === 1 ? '' : 's'} showing improvement.`,
		)
	}

	if (input.newFindingsCount > 0) {
		bullets.push(
			`${input.newFindingsCount} new abnormal finding${input.newFindingsCount === 1 ? '' : 's'} in recent reports.`,
		)
	}

	if (input.stableCount > 0 && bullets.length < 4) {
		bullets.push(
			`${input.stableCount} tracked marker${input.stableCount === 1 ? '' : 's'} holding steady.`,
		)
	}

	const longTerm = input.insights
		.filter((item) => item.category === 'long_term_trends')
		.slice(0, 2)

	for (const insight of longTerm) {
		if (bullets.length >= 5) {
			break
		}

		if (!bullets.some((bullet) => bullet === insight.summary)) {
			bullets.push(insight.summary)
		}
	}

	return bullets.slice(0, 5)
}
