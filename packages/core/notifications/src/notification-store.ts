import type { EventBus } from '@chronicle/core-events'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface ChronicleNotification {
	id: string
	channel: string
	severity: NotificationSeverity
	message: string
	timestamp: string
	metadata?: Record<string, unknown>
}

export type NotificationInput = {
	channel: string
	severity: NotificationSeverity
	message: string
	metadata?: Record<string, unknown>
	id?: string
}

export type NotificationListener = (notification: ChronicleNotification) => void

export type EventNotificationMapper<TEvent = unknown> = (
	event: TEvent,
) => NotificationInput | null | NotificationInput[]

interface ChannelStore {
	history: ChronicleNotification[]
	listeners: Set<NotificationListener>
}

const channels = new Map<string, ChannelStore>()
const eventMappers = new Map<string, Set<EventNotificationMapper>>()

const DEFAULT_HISTORY_LIMIT = 20

function getChannelStore(channel: string): ChannelStore {
	const existing = channels.get(channel)

	if (existing) {
		return existing
	}

	const store: ChannelStore = {
		history: [],
		listeners: new Set(),
	}

	channels.set(channel, store)
	return store
}

export function pushNotification(input: {
	channel: string
	severity: NotificationSeverity
	message: string
	metadata?: Record<string, unknown>
	id?: string
	historyLimit?: number
}): ChronicleNotification {
	const store = getChannelStore(input.channel)
	const notification: ChronicleNotification = {
		id: input.id ?? crypto.randomUUID(),
		channel: input.channel,
		severity: input.severity,
		message: input.message,
		timestamp: new Date().toISOString(),
		metadata: input.metadata,
	}

	const limit = input.historyLimit ?? DEFAULT_HISTORY_LIMIT
	store.history.unshift(notification)

	if (store.history.length > limit) {
		store.history.length = limit
	}

	for (const listener of store.listeners) {
		listener(notification)
	}

	return notification
}

export function subscribeNotifications(
	channel: string,
	listener: NotificationListener,
): () => void {
	const store = getChannelStore(channel)
	store.listeners.add(listener)

	return () => {
		store.listeners.delete(listener)
	}
}

export function getNotifications(channel: string): ChronicleNotification[] {
	return [...getChannelStore(channel).history]
}

export function clearNotifications(channel: string): void {
	getChannelStore(channel).history.length = 0
}

export function registerEventNotificationMapper<TEvent>(
	eventType: string,
	mapper: EventNotificationMapper<TEvent>,
): () => void {
	if (!eventMappers.has(eventType)) {
		eventMappers.set(eventType, new Set())
	}

	const mappers = eventMappers.get(eventType)!
	mappers.add(mapper as EventNotificationMapper)

	return () => {
		mappers.delete(mapper as EventNotificationMapper)
	}
}

export function dispatchEventNotifications<TEvent>(
	eventType: string,
	event: TEvent,
): void {
	const specific = eventMappers.get(eventType) ?? new Set()
	const global = eventMappers.get('*') ?? new Set()
	const notifications: NotificationInput[] = []

	for (const mapper of [...specific, ...global]) {
		const mapped = mapper(event)

		if (!mapped) {
			continue
		}

		if (Array.isArray(mapped)) {
			notifications.push(...mapped)
			continue
		}

		notifications.push(mapped)
	}

	for (const notification of notifications) {
		pushNotification({
			channel: notification.channel,
			severity: notification.severity,
			message: notification.message,
			metadata: notification.metadata,
			id: notification.id,
		})
	}
}

/** Subscribe an event bus to the notification bridge. */
export function bridgeEventBusToNotifications<TType extends string, TEvent>(
	bus: EventBus<TType, TEvent>,
	getEventType: (event: TEvent) => string,
): () => void {
	return bus.subscribe('*', async (event) => {
		dispatchEventNotifications(getEventType(event), event)
	})
}
