import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import { mergeSearchHits } from '@/features/intelligence/services/semantic-search.service'

export interface SearchRankingContext {
	memberId?: string | null
	queryTokens?: string[]
}

function recencyBoost(date?: string): number {
	if (!date) {
		return 0
	}

	const ageMs = Date.now() - new Date(date).getTime()
	const ageDays = ageMs / (1000 * 60 * 60 * 24)

	if (Number.isNaN(ageDays) || ageDays < 0) {
		return 0.15
	}

	if (ageDays <= 90) {
		return 0.35
	}

	if (ageDays <= 365) {
		return 0.2
	}

	if (ageDays <= 730) {
		return 0.1
	}

	return 0
}

function reportTypeBoost(
	hit: SemanticSearchHit,
	queryTokens: string[],
): number {
	if (!hit.reportType || queryTokens.length === 0) {
		return 0
	}

	const normalized = hit.reportType.toLowerCase()

	return queryTokens.some((token) => normalized.includes(token)) ? 0.2 : 0
}

export function rankSearchHits(
	hits: SemanticSearchHit[],
	context: SearchRankingContext = {},
	limit = 12,
): SemanticSearchHit[] {
	const queryTokens = context.queryTokens ?? []

	const ranked = hits.map((hit) => {
		let score = hit.score
		score += recencyBoost(hit.date)

		if (context.memberId && hit.memberId && hit.memberId === context.memberId) {
			score += 0.25
		}

		score += reportTypeBoost(hit, queryTokens)

		if (hit.kind === 'metric') {
			score += 0.05
		}

		if (hit.kind === 'timeline') {
			score += 0.03
		}

		return { ...hit, score }
	})

	return mergeSearchHits(ranked, limit)
}

export function topReportIdsFromHits(
	hits: SemanticSearchHit[],
	limit = 6,
): string[] {
	const ids = new Set<string>()

	for (const hit of hits) {
		if (hit.reportId) {
			ids.add(hit.reportId)
		}

		if (ids.size >= limit) {
			break
		}
	}

	return [...ids]
}
