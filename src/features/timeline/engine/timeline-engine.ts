import type { TimelineProviderQuery } from '@/features/timeline/contracts/timeline-provider.contract'
import { groupTimelineByMonth } from '@/features/timeline/engine/timeline-grouping'
import { getSupportingTimelineProviders } from '@/features/timeline/registry/timeline-registry'
import type {
	ChronicleTimelineEvent,
	TimelineBuildResult,
	TimelineFilters,
	TimelineImportance,
	TimelineSources,
} from '@/features/timeline/types/timeline.types'
import {
	scoreTextMatch,
	tokenizeQuery,
} from '@/features/intelligence/services/semantic-search.service'
import { filterLifeTimelineEvents } from '@/features/timeline/utils/life-timeline.utils'

const IMPORTANCE_ORDER: Record<TimelineImportance, number> = {
	high: 3,
	medium: 2,
	low: 1,
}

function compareEvents(
	left: ChronicleTimelineEvent,
	right: ChronicleTimelineEvent,
): number {
	const timeDiff =
		new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()

	if (timeDiff !== 0) {
		return timeDiff
	}

	return IMPORTANCE_ORDER[right.importance] - IMPORTANCE_ORDER[left.importance]
}

function dedupeEvents(
	events: ChronicleTimelineEvent[],
): ChronicleTimelineEvent[] {
	const seen = new Set<string>()
	const deduped: ChronicleTimelineEvent[] = []

	for (const event of events) {
		if (seen.has(event.id)) {
			continue
		}

		seen.add(event.id)
		deduped.push(event)
	}

	return deduped
}

export function filterTimelineEvents(
	events: ChronicleTimelineEvent[],
	filters: TimelineFilters = {},
): ChronicleTimelineEvent[] {
	let filtered = events

	if (filters.memberId) {
		filtered = filtered.filter(
			(event) =>
				event.familyMemberId === filters.memberId ||
				event.familyMemberId == null,
		)
	}

	if (filters.modules?.length) {
		const allowed = new Set(filters.modules)
		filtered = filtered.filter((event) => allowed.has(event.sourceModule))
	}

	if (filters.importance?.length) {
		const allowed = new Set(filters.importance)
		filtered = filtered.filter((event) => allowed.has(event.importance))
	}

	if (filters.fromDate) {
		const fromMs = Date.parse(filters.fromDate)

		if (!Number.isNaN(fromMs)) {
			filtered = filtered.filter(
				(event) => Date.parse(event.timestamp) >= fromMs,
			)
		}
	}

	if (filters.toDate) {
		const toMs = Date.parse(filters.toDate)

		if (!Number.isNaN(toMs)) {
			filtered = filtered.filter((event) => Date.parse(event.timestamp) <= toMs)
		}
	}

	if (filters.searchQuery?.trim()) {
		const tokens = tokenizeQuery(filters.searchQuery)
		filtered = filtered.filter((event) => {
			const body = [
				event.title,
				event.summary,
				event.tags.join(' '),
				event.eventType,
				event.sourceModule,
				...Object.values(event.metadata),
			].join(' ')

			return scoreTextMatch(tokens, body) > 0
		})
	}

	if (filters.lifeEventsOnly !== false) {
		filtered = filterLifeTimelineEvents(filtered)
	}

	return filtered
}

export function buildTimelineEvents(input: {
	userId: string
	memberId?: string | null
	memberName?: string | null
	sources: TimelineSources
	filters?: TimelineFilters
	limit?: number
	offset?: number
}): TimelineBuildResult {
	const query: TimelineProviderQuery = {
		userId: input.userId,
		memberId: input.memberId,
		memberName: input.memberName,
		sources: input.sources,
		filters: input.filters,
	}

	const providerEvents = getSupportingTimelineProviders(query).flatMap(
		(provider) => provider.getEvents(query),
	)

	const merged = dedupeEvents(providerEvents).sort(compareEvents)
	const filtered = filterTimelineEvents(merged, input.filters)
	const offset = input.offset ?? 0
	const limit = input.limit ?? filtered.length
	const paginated = filtered.slice(offset, offset + limit)

	return {
		events: paginated,
		totalCount: filtered.length,
		groups: groupTimelineByMonth(paginated),
	}
}

export function buildTimelinePreview(
	input: Parameters<typeof buildTimelineEvents>[0],
	count = 5,
): ChronicleTimelineEvent[] {
	const all = buildTimelineEvents({
		...input,
		limit: undefined,
		offset: undefined,
	}).events

	return [...all]
		.sort((left, right) => {
			const importanceDiff =
				IMPORTANCE_ORDER[right.importance] - IMPORTANCE_ORDER[left.importance]

			if (importanceDiff !== 0) {
				return importanceDiff
			}

			return compareEvents(left, right)
		})
		.slice(0, count)
}

export function resolveTimelineYearFilter(question: string): {
	fromDate?: string
	toDate?: string
} {
	const normalized = question.trim()
	const currentYear = new Date().getFullYear()

	if (/last year/i.test(normalized)) {
		const year = currentYear - 1
		return {
			fromDate: `${year}-01-01`,
			toDate: `${year}-12-31`,
		}
	}

	const yearMatch = normalized.match(/\b(20\d{2})\b/)

	if (yearMatch?.[1]) {
		const year = Number(yearMatch[1])
		return {
			fromDate: `${year}-01-01`,
			toDate: `${year}-12-31`,
		}
	}

	if (/this year/i.test(normalized)) {
		return {
			fromDate: `${currentYear}-01-01`,
			toDate: `${currentYear}-12-31`,
		}
	}

	return {}
}
