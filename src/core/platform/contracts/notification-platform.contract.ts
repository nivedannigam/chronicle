import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'

export type PlatformNotificationSeverity = 'info' | 'warning' | 'critical'

export interface PlatformNotification {
	id: string
	moduleId: PlatformModuleId
	title: string
	body: string
	severity: PlatformNotificationSeverity
	createdAt: string
	actionPath?: string
	dedupeKey?: string
}

export interface NotificationContributorQuery {
	userId: string
	memberId?: string | null
	limit?: number
}

/** Modules contribute notifications to the shared notification center. */
export interface ChronicleNotificationContributor {
	readonly id: string
	readonly moduleId: PlatformModuleId
	readonly label: string
	readonly priority?: number

	getNotifications(query: NotificationContributorQuery): PlatformNotification[]
}
