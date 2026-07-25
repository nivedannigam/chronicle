import { getCategoryMeta } from '@/features/health-knowledge/graph/metric-categories'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type {
	HealthScorecard,
	ScorecardSection,
} from '@/features/health-insights/types/health-insights.types'
import { INSIGHT_SAFETY_DISCLAIMER } from '@/features/health-insights/types/health-insights.types'

const SCORECARD_SECTIONS: Array<{
	id: string
	label: string
	categoryIds: string[]
}> = [
	{ id: 'cardiovascular', label: 'Cardiovascular', categoryIds: ['heart'] },
	{ id: 'metabolic', label: 'Metabolic', categoryIds: ['diabetes'] },
	{ id: 'liver', label: 'Liver', categoryIds: ['liver'] },
	{ id: 'kidney', label: 'Kidney', categoryIds: ['kidney'] },
	{ id: 'blood', label: 'Blood Health', categoryIds: ['blood'] },
	{ id: 'thyroid', label: 'Thyroid', categoryIds: ['thyroid'] },
	{ id: 'wellness', label: 'General Wellness', categoryIds: ['vitamin'] },
]

export function buildHealthScorecard(
	graph: HealthKnowledgeGraph,
): HealthScorecard {
	const sections: ScorecardSection[] = SCORECARD_SECTIONS.map((section) =>
		buildScorecardSection(
			section.id,
			section.label,
			section.categoryIds,
			graph,
		),
	)

	return {
		generatedAt: new Date().toISOString(),
		sections,
		disclaimer: INSIGHT_SAFETY_DISCLAIMER,
	}
}

function buildScorecardSection(
	id: string,
	label: string,
	categoryIds: string[],
	graph: HealthKnowledgeGraph,
): ScorecardSection {
	const categories = graph.profile.categories.filter((category) =>
		categoryIds.includes(category.categoryId),
	)
	const histories = graph.profile.metricHistories.filter((history) =>
		categoryIds.includes(history.categoryId),
	)

	if (categories.length === 0 && histories.length === 0) {
		return {
			id,
			label,
			summary: 'No data in Chronicle yet for this area.',
			status: 'none',
			metricCount: 0,
			lastUpdated: null,
		}
	}

	const category = categories[0]
	const meta = category ? getCategoryMeta(category.categoryId) : null
	const abnormalCount = histories.filter((history) => {
		const latest = history.observations[history.observations.length - 1]

		return (
			latest?.status === 'low' ||
			latest?.status === 'high' ||
			latest?.status === 'critical' ||
			latest?.status === 'borderline'
		)
	}).length

	const improvingCount = histories.filter(
		(history) => history.trend.direction === 'improving',
	).length

	let summary = category
		? `Latest: ${category.latestValue}. ${category.statusLabel}.`
		: `${histories.length} metric${histories.length === 1 ? '' : 's'} tracked.`

	if (improvingCount > 0) {
		summary += ` ${improvingCount} improving.`
	}

	if (abnormalCount > 0) {
		summary += ` ${abnormalCount} need attention.`
	}

	if (meta && histories.length === 0) {
		summary = `No ${meta.name.toLowerCase()} metrics in your records yet.`
	}

	return {
		id,
		label,
		summary: summary.trim(),
		status: histories.length >= 2 ? 'available' : 'limited',
		metricCount: histories.length,
		lastUpdated: category?.lastUpdated ?? null,
		trend: category?.trend,
	}
}
