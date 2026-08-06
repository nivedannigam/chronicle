import type {
	ChronicleNotificationContributor,
	NotificationContributorQuery,
	PlatformNotification,
} from '@/core/platform/contracts/notification-platform.contract'

const contributors = new Map<string, ChronicleNotificationContributor>()

export function registerNotificationContributor(
	contributor: ChronicleNotificationContributor,
): void {
	contributors.set(contributor.id, contributor)
}

export function unregisterNotificationContributor(contributorId: string): void {
	contributors.delete(contributorId)
}

export function clearNotificationContributors(): void {
	contributors.clear()
}

export function getRegisteredNotificationContributors(): ChronicleNotificationContributor[] {
	return [...contributors.values()].sort(
		(left, right) => (left.priority ?? 100) - (right.priority ?? 100),
	)
}

export function collectPlatformNotifications(
	query: NotificationContributorQuery,
): PlatformNotification[] {
	const notifications: PlatformNotification[] = []

	for (const contributor of getRegisteredNotificationContributors()) {
		try {
			notifications.push(...contributor.getNotifications(query))
		} catch {
			// Skip failed contributor.
		}
	}

	const limit = query.limit ?? 50

	return notifications
		.sort(
			(left, right) =>
				new Date(right.createdAt).getTime() -
				new Date(left.createdAt).getTime(),
		)
		.slice(0, limit)
}
