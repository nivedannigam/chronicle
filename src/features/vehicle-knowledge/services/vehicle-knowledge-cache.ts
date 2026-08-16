const cache = new Map<string, number>()

export function invalidateVehicleKnowledgeCache(userId: string): void {
	cache.delete(userId)
}

export function markVehicleKnowledgeStale(userId: string): void {
	cache.set(userId, Date.now())
}

export function isVehicleKnowledgeStale(userId: string): boolean {
	return cache.has(userId)
}
