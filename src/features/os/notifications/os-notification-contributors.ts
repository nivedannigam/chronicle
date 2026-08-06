import { documentPath, healthReportPath, ROUTES } from '@/constants/routes'
import { documentsExpiringWithin } from '@/features/documents/services/document.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { getReportDisplayTitle } from '@/features/health/services/health-parsed-report.service'
import type {
	ChronicleNotificationContributor,
	PlatformNotification,
} from '@/core/platform/contracts/notification-platform.contract'

function daysUntil(dateIso: string): number {
	return Math.ceil(
		(new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	)
}

export function createDocumentsNotificationContributor(
	getDocuments: () => ChronicleDocument[],
): ChronicleNotificationContributor {
	return {
		id: 'documents-expiry',
		moduleId: 'documents',
		label: 'Documents',
		priority: 10,
		getNotifications(): PlatformNotification[] {
			const notifications: PlatformNotification[] = []

			for (const document of documentsExpiringWithin(getDocuments(), 90)) {
				if (!document.expiry_date) {
					continue
				}

				const days = daysUntil(document.expiry_date)
				notifications.push({
					id: `notif-doc-${document.id}`,
					moduleId: 'documents',
					title: document.title,
					body:
						days <= 0
							? 'This document has expired'
							: `Expires in ${days} day${days === 1 ? '' : 's'}`,
					severity: days <= 14 ? 'critical' : 'warning',
					createdAt: document.uploaded_at,
					actionPath: documentPath(document.id),
					dedupeKey: `doc-expiry-${document.id}`,
				})
			}

			return notifications
		},
	}
}

export function createHealthNotificationContributor(
	getReports: () => UploadedHealthReport[],
): ChronicleNotificationContributor {
	return {
		id: 'health-attention',
		moduleId: 'health',
		label: 'Health',
		priority: 20,
		getNotifications(): PlatformNotification[] {
			const notifications: PlatformNotification[] = []

			for (const report of getReports()) {
				if (report.status !== 'completed') {
					continue
				}

				const parsed = getParsedHealthReport(report)
				const hasAbnormal = parsed?.metrics.some((metric) =>
					['low', 'high', 'critical'].includes(metric.status),
				)

				if (!hasAbnormal) {
					continue
				}

				notifications.push({
					id: `notif-health-${report.id}`,
					moduleId: 'health',
					title: 'Result needs attention',
					body: getReportDisplayTitle(report),
					severity: 'warning',
					createdAt: report.processed_at ?? report.uploaded_at,
					actionPath: healthReportPath(report.id),
					dedupeKey: `health-abnormal-${report.id}`,
				})
			}

			return notifications
		},
	}
}

export function createInsuranceNotificationContributor(
	getKnowledge: () =>
		| import('@/features/insurance-knowledge/types/insurance-knowledge-object.types').InsuranceKnowledge
		| null,
): ChronicleNotificationContributor {
	return {
		id: 'insurance-renewals',
		moduleId: 'insurance',
		label: 'Insurance',
		priority: 15,
		getNotifications(): PlatformNotification[] {
			const knowledge = getKnowledge()
			if (!knowledge) {
				return []
			}

			return knowledge.expiringPolicies.map((policy) => ({
				id: `notif-policy-${policy.id}`,
				moduleId: 'insurance',
				title: policy.productName ?? policy.policyNumber,
				body:
					policy.daysUntilExpiry != null
						? `Renews in ${policy.daysUntilExpiry} day${policy.daysUntilExpiry === 1 ? '' : 's'}`
						: 'Renewal approaching',
				severity:
					policy.daysUntilExpiry != null && policy.daysUntilExpiry <= 14
						? 'critical'
						: 'warning',
				createdAt: knowledge.generatedAt,
				actionPath: ROUTES.insurancePolicies,
				dedupeKey: `policy-renewal-${policy.id}`,
			}))
		},
	}
}
