import type { ImportNotification } from '@/features/health-import/types/health-import.types'
import {
	clearNotifications,
	getNotifications,
	pushNotification,
	subscribeNotifications,
} from '@chronicle/core-notifications'
import { HEALTH_IMPORT_NOTIFICATION_CHANNEL } from '@/features/health-import/services/import-notification.subscriber'

function toImportNotification(
	notification: import('@chronicle/core-notifications').ChronicleNotification,
): ImportNotification {
	const type =
		(notification.metadata?.type as ImportNotification['type'] | undefined) ??
		(notification.severity === 'success'
			? 'complete'
			: notification.severity === 'error'
				? 'failed'
				: 'started')

	return {
		id: notification.id,
		type,
		message: notification.message,
		timestamp: notification.timestamp,
	}
}

export function subscribeImportNotifications(
	listener: (notification: ImportNotification) => void,
): () => void {
	return subscribeNotifications(
		HEALTH_IMPORT_NOTIFICATION_CHANNEL,
		(notification) => {
			listener(toImportNotification(notification))
		},
	)
}

export function getImportNotifications(): ImportNotification[] {
	return getNotifications(HEALTH_IMPORT_NOTIFICATION_CHANNEL).map(
		toImportNotification,
	)
}

/** @deprecated Prefer emitImportEvent — kept for transitional callers. */
export function pushImportNotification(
	type: ImportNotification['type'],
	message: string,
): ImportNotification {
	const severity =
		type === 'complete' || type === 'retry_complete'
			? 'success'
			: type === 'failed'
				? 'error'
				: 'info'

	const notification = pushNotification({
		channel: HEALTH_IMPORT_NOTIFICATION_CHANNEL,
		severity,
		message,
		metadata: { type },
	})

	return toImportNotification(notification)
}

export function clearImportNotifications(): void {
	clearNotifications(HEALTH_IMPORT_NOTIFICATION_CHANNEL)
}
