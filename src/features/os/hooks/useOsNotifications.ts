import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import {
	createDocumentsNotificationContributor,
	createHealthNotificationContributor,
	createInsuranceNotificationContributor,
} from '@/features/os/notifications/os-notification-contributors'
import type { PlatformNotification } from '@/core/platform/contracts/notification-platform.contract'

export function useOsNotifications(): {
	notifications: PlatformNotification[]
	isLoading: boolean
} {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const reportsQuery = useUploadedHealthReports(userId)
	const documentsQuery = useDocuments()
	const insuranceQuery = useInsuranceKnowledge()

	const notifications = useMemo(() => {
		const reports = reportsQuery.data ?? []
		const documents = documentsQuery.data ?? []
		const knowledge = insuranceQuery.knowledge

		const contributors = [
			createDocumentsNotificationContributor(() => documents),
			createHealthNotificationContributor(() => reports),
			createInsuranceNotificationContributor(() => knowledge),
		]

		const collected: PlatformNotification[] = []
		for (const contributor of contributors) {
			collected.push(...contributor.getNotifications({ userId, limit: 50 }))
		}

		return collected.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
	}, [userId, reportsQuery.data, documentsQuery.data, insuranceQuery.knowledge])

	return {
		notifications,
		isLoading:
			reportsQuery.isLoading ||
			documentsQuery.isLoading ||
			insuranceQuery.isLoading,
	}
}
