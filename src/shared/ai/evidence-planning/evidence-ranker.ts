import type { QuestionType } from '@/shared/ai/evidence-planning/types'

export interface RankableEvidenceItem {
	id: string
	relevance: number
	recency: number
	importance: number
	trend: number
}

/** Integer priorities — higher sorts first (lexicographic, not percentages). */
export interface RankingAxisPriority {
	relevance: number
	recency: number
	importance: number
	trend: number
}

export function rankingAxisPriority(
	questionType: QuestionType,
): RankingAxisPriority {
	switch (questionType) {
		case 'FACT_LOOKUP':
			return { relevance: 4, recency: 3, importance: 2, trend: 1 }
		case 'TREND':
			return { trend: 4, relevance: 3, recency: 2, importance: 1 }
		case 'COMPARE':
			return { recency: 4, relevance: 3, trend: 2, importance: 1 }
		case 'LATEST_REPORT':
			return { recency: 4, relevance: 3, importance: 2, trend: 1 }
		case 'EXPLAIN':
			return { relevance: 4, importance: 3, recency: 2, trend: 1 }
		case 'STATUS_OVERVIEW':
			return { recency: 4, relevance: 3, importance: 2, trend: 1 }
		case 'UNKNOWN':
		default:
			return { relevance: 3, recency: 3, importance: 2, trend: 1 }
	}
}

function compareAxis(a: number, b: number, priority: number): number {
	if (priority === 0) {
		return 0
	}

	return b - a
}

export function compareRankedItems(
	a: RankableEvidenceItem,
	b: RankableEvidenceItem,
	priority: RankingAxisPriority,
): number {
	const axes: Array<keyof RankingAxisPriority> = [
		'relevance',
		'recency',
		'importance',
		'trend',
	]

	for (const axis of axes.sort(
		(left, right) => priority[right] - priority[left],
	)) {
		const delta = compareAxis(a[axis], b[axis], priority[axis])

		if (delta !== 0) {
			return delta
		}
	}

	return 0
}

export function sortByEvidenceRanking<T extends RankableEvidenceItem>(
	items: T[],
	questionType: QuestionType,
): T[] {
	const priority = rankingAxisPriority(questionType)

	return [...items].sort((a, b) => compareRankedItems(a, b, priority))
}

export function recencyScore(observedAt: string | undefined): number {
	if (!observedAt?.trim()) {
		return 0
	}

	const timestamp = new Date(observedAt).getTime()

	if (Number.isNaN(timestamp)) {
		return 0
	}

	const ageMs = Date.now() - timestamp
	const twoYearsMs = 730 * 24 * 60 * 60 * 1000

	return Math.max(0, 1 - ageMs / twoYearsMs)
}

export function clinicalImportanceScore(input: {
	status: string
	clinicalScore?: number
}): number {
	const status = input.status.toLowerCase()

	if (status === 'critical') {
		return 1
	}

	if (status === 'high' || status === 'low') {
		return 0.85
	}

	if (status === 'borderline') {
		return 0.7
	}

	if (typeof input.clinicalScore === 'number') {
		return Math.min(1, input.clinicalScore / 140)
	}

	if (status === 'normal') {
		return 0.35
	}

	return 0.2
}

export function trendSignificanceScore(input: {
	isActionable?: boolean
	dataPointCount?: number
	changePercent?: number | null
}): number {
	let score = 0

	if (input.isActionable) {
		score += 0.5
	}

	if ((input.dataPointCount ?? 0) >= 2) {
		score += 0.25
	}

	if (
		typeof input.changePercent === 'number' &&
		!Number.isNaN(input.changePercent) &&
		Math.abs(input.changePercent) >= 5
	) {
		score += 0.25
	}

	return Math.min(1, score)
}

export function subjectRelevanceScore(input: {
	haystack: string
	categoryId?: string
	metricIds?: string[]
	metricNames?: string[]
	canonicalId?: string
	categoryMatch?: boolean
}): number {
	let score = 0.2
	const normalized = input.haystack.toLowerCase()

	if (input.categoryMatch) {
		score += 0.35
	}

	for (const metricId of input.metricIds ?? []) {
		if (
			normalized.includes(metricId.toLowerCase()) ||
			input.canonicalId === metricId
		) {
			score += 0.45
		}
	}

	for (const name of input.metricNames ?? []) {
		if (normalized.includes(name.toLowerCase())) {
			score += 0.45
		}
	}

	return Math.min(1, score)
}
