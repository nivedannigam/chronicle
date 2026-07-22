import { C } from '@/constants/colors'
import { queryClient } from '@/lib/query-client'
import {
	buildKnowledgeItemFromInput,
	getMockSeedInputs,
} from '@/features/knowledge/services/mock-knowledge'
import {
	findKnowledgeItemBySource,
	getKnowledgeStore,
	upsertKnowledgeItem,
} from '@/features/knowledge/services/mock-knowledge.store'
import type {
	CreateKnowledgeItemInput,
	KnowledgeItem,
	KnowledgeItemType,
	KnowledgeSearchParams,
	KnowledgeSearchResult,
	KnowledgeTimelineEntry,
	UpdateKnowledgeItemInput,
} from '@/features/knowledge/types'

const seededUsers = new Set<string>()

export const KNOWLEDGE_TIMELINE_QUERY_KEY = 'knowledge-timeline'

export function knowledgeTimelineQueryKey(userId: string | undefined) {
	return [KNOWLEDGE_TIMELINE_QUERY_KEY, userId] as const
}

function notifyKnowledgeChanged(userId: string) {
	void queryClient.invalidateQueries({
		queryKey: knowledgeTimelineQueryKey(userId),
	})
}

function ensureSeeded(userId: string) {
	if (seededUsers.has(userId)) {
		return
	}

	for (const input of getMockSeedInputs(userId)) {
		if (!findKnowledgeItemBySource(userId, input.source, input.sourceId)) {
			upsertKnowledgeItem(buildKnowledgeItemFromInput(input))
		}
	}

	seededUsers.add(userId)
}

function sortByNewest(items: KnowledgeItem[]): KnowledgeItem[] {
	return [...items].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	)
}

function defaultColorForType(type: KnowledgeItemType): string {
	switch (type) {
		case 'HealthReport':
		case 'HealthMetric':
			return C.teal
		case 'Email':
			return C.red
		case 'Finance':
			return C.orange
		case 'Trip':
			return C.green
		case 'Task':
			return C.accentBlue
		case 'Document':
			return C.accent
		case 'Photo':
			return C.photos
		case 'Insurance':
			return C.teal
		case 'Vehicle':
			return C.yellow
		case 'Event':
			return C.accentBlue
		default:
			return C.textMuted
	}
}

function formatTimelineTime(item: KnowledgeItem): string {
	const displayTime = item.metadata.displayTime

	if (typeof displayTime === 'string' && displayTime.length > 0) {
		return displayTime
	}

	return new Date(item.createdAt).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	})
}

function toTimelineEntry(item: KnowledgeItem): KnowledgeTimelineEntry {
	const metadataColor = item.metadata.color

	return {
		id: item.id,
		time: formatTimelineTime(item),
		event: item.title,
		color:
			typeof metadataColor === 'string'
				? metadataColor
				: defaultColorForType(item.type),
		type: item.type,
		source: item.source,
	}
}

export function createKnowledgeItem(
	input: CreateKnowledgeItemInput,
): KnowledgeItem {
	ensureSeeded(input.userId)

	const existing = findKnowledgeItemBySource(
		input.userId,
		input.source,
		input.sourceId,
	)

	if (existing) {
		return existing
	}

	const item = buildKnowledgeItemFromInput(input)
	upsertKnowledgeItem(item)
	notifyKnowledgeChanged(input.userId)
	return item
}

export function updateKnowledgeItem(
	userId: string,
	itemId: string,
	updates: UpdateKnowledgeItemInput,
): KnowledgeItem | undefined {
	ensureSeeded(userId)

	const items = getKnowledgeStore(userId)
	const current = items.find((item) => item.id === itemId)

	if (!current) {
		return undefined
	}

	const updated: KnowledgeItem = {
		...current,
		...updates,
		tags: updates.tags ?? current.tags,
		metadata: updates.metadata
			? { ...current.metadata, ...updates.metadata }
			: current.metadata,
		updatedAt: new Date().toISOString(),
	}

	upsertKnowledgeItem(updated)
	notifyKnowledgeChanged(userId)
	return updated
}

/**
 * Platform stub — replaces mock title/summary filter with vector / full-text search.
 */
export function searchKnowledge(
	params: KnowledgeSearchParams,
): KnowledgeSearchResult {
	ensureSeeded(params.userId)

	const query = params.query?.trim().toLowerCase() ?? ''
	let items = sortByNewest(getKnowledgeStore(params.userId))

	if (params.types?.length) {
		items = items.filter((item) => params.types!.includes(item.type))
	}

	if (params.tags?.length) {
		items = items.filter((item) =>
			params.tags!.some((tag) => item.tags.includes(tag)),
		)
	}

	if (query) {
		items = items.filter(
			(item) =>
				item.title.toLowerCase().includes(query) ||
				item.summary.toLowerCase().includes(query),
		)
	}

	if (params.limit) {
		items = items.slice(0, params.limit)
	}

	return {
		items,
		query,
		implementation: 'mock-filter',
	}
}

export function getKnowledgeTimeline(userId: string): KnowledgeTimelineEntry[] {
	ensureSeeded(userId)
	return sortByNewest(getKnowledgeStore(userId)).map(toTimelineEntry)
}

export function getKnowledgeItems(userId: string): KnowledgeItem[] {
	ensureSeeded(userId)
	return sortByNewest(getKnowledgeStore(userId))
}

export function getKnowledgeItemById(
	userId: string,
	itemId: string,
): KnowledgeItem | undefined {
	ensureSeeded(userId)
	return getKnowledgeStore(userId).find((item) => item.id === itemId)
}
