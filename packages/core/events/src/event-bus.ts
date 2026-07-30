export type EventHandler<TEvent> = (event: TEvent) => void | Promise<void>

export interface EventBus<TType extends string, TEvent> {
	subscribe: (
		eventType: TType | '*',
		handler: EventHandler<TEvent>,
	) => () => void
	publish: (event: TEvent) => Promise<void>
	clear: () => void
}

export function createEventBus<TType extends string, TEvent>(
	getEventType: (event: TEvent) => TType,
): EventBus<TType, TEvent> {
	const handlers = new Map<TType | '*', Set<EventHandler<TEvent>>>()

	function subscribe(
		eventType: TType | '*',
		handler: EventHandler<TEvent>,
	): () => void {
		if (!handlers.has(eventType)) {
			handlers.set(eventType, new Set())
		}

		handlers.get(eventType)!.add(handler)

		return () => {
			handlers.get(eventType)?.delete(handler)
		}
	}

	async function publish(event: TEvent): Promise<void> {
		const type = getEventType(event)
		const specific = handlers.get(type) ?? new Set()
		const global = handlers.get('*') ?? new Set()

		await Promise.allSettled(
			[...specific, ...global].map((handler) => handler(event)),
		)
	}

	function clear(): void {
		handlers.clear()
	}

	return { subscribe, publish, clear }
}
