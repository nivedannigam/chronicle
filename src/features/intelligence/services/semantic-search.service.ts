export function tokenizeQuery(value: string): string[] {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/i)
		.filter((token) => token.length > 2)
}

export function scoreTextMatch(queryTokens: string[], text: string): number {
	if (queryTokens.length === 0 || !text.trim()) {
		return 0
	}

	const haystack = text.toLowerCase()
	let score = 0

	for (const token of queryTokens) {
		if (haystack.includes(token)) {
			score += 1
		}
	}

	return score
}

export function extractTextSnippet(
	text: string,
	queryTokens: string[],
	maxLength = 140,
): string {
	const normalized = text.replace(/\s+/g, ' ').trim()

	if (!normalized) {
		return ''
	}

	if (queryTokens.length === 0) {
		return normalized.slice(0, maxLength)
	}

	const lower = normalized.toLowerCase()
	let bestIndex = -1

	for (const token of queryTokens) {
		const index = lower.indexOf(token)

		if (index >= 0 && (bestIndex === -1 || index < bestIndex)) {
			bestIndex = index
		}
	}

	if (bestIndex === -1) {
		return normalized.slice(0, maxLength)
	}

	const start = Math.max(0, bestIndex - 40)
	const end = Math.min(normalized.length, start + maxLength)
	const prefix = start > 0 ? '…' : ''
	const suffix = end < normalized.length ? '…' : ''

	return `${prefix}${normalized.slice(start, end)}${suffix}`
}

export function mergeSearchHits<T extends { id: string; score: number }>(
	hits: T[],
	limit = 12,
): T[] {
	const byId = new Map<string, T>()

	for (const hit of hits) {
		const existing = byId.get(hit.id)

		if (!existing || hit.score > existing.score) {
			byId.set(hit.id, hit)
		}
	}

	return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}
