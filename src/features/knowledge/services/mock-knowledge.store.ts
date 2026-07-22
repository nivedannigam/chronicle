import type { KnowledgeItem } from '@/features/knowledge/types'

const knowledgeStore = new Map<string, KnowledgeItem[]>()

export function getKnowledgeStore(userId: string): KnowledgeItem[] {
	if (!knowledgeStore.has(userId)) {
		knowledgeStore.set(userId, [])
	}

	return knowledgeStore.get(userId)!
}

export function setKnowledgeStore(userId: string, items: KnowledgeItem[]) {
	knowledgeStore.set(userId, items)
}

export function findKnowledgeItemBySource(
	userId: string,
	source: string,
	sourceId: string,
): KnowledgeItem | undefined {
	return getKnowledgeStore(userId).find(
		(item) => item.source === source && item.sourceId === sourceId,
	)
}

export function upsertKnowledgeItem(item: KnowledgeItem): KnowledgeItem {
	const items = getKnowledgeStore(item.userId)
	const index = items.findIndex((entry) => entry.id === item.id)

	if (index >= 0) {
		items[index] = item
	} else {
		items.push(item)
	}

	knowledgeStore.set(item.userId, items)
	return item
}

export function removeKnowledgeItem(userId: string, itemId: string): boolean {
	const items = getKnowledgeStore(userId)
	const nextItems = items.filter((item) => item.id !== itemId)
	knowledgeStore.set(userId, nextItems)
	return nextItems.length !== items.length
}

export function clearKnowledgeStore(userId: string) {
	knowledgeStore.delete(userId)
}
