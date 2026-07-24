import type { ImportNotification } from '@/features/health-import/types/health-import.types'

const listeners = new Set<(notification: ImportNotification) => void>()
const history: ImportNotification[] = []

export function subscribeImportNotifications(
	listener: (notification: ImportNotification) => void,
): () => void {
	listeners.add(listener)

	return () => listeners.delete(listener)
}

export function getImportNotifications(): ImportNotification[] {
	return [...history]
}

export function pushImportNotification(
	type: ImportNotification['type'],
	message: string,
): ImportNotification {
	const notification: ImportNotification = {
		id: crypto.randomUUID(),
		type,
		message,
		timestamp: new Date().toISOString(),
	}

	history.unshift(notification)

	if (history.length > 20) {
		history.length = 20
	}

	for (const listener of listeners) {
		listener(notification)
	}

	return notification
}

export function clearImportNotifications(): void {
	history.length = 0
}
