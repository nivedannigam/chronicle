import { documentPath, healthReportPath, ROUTES } from '@/constants/routes'
import { documentsExpiringWithin } from '@/features/documents/services/document.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { getReportDisplayTitle } from '@/features/health/services/health-parsed-report.service'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { UpcomingItem } from '@/features/os/types/os.types'

function daysUntil(dateIso: string): number {
	return Math.ceil(
		(new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	)
}

function formatExpiryDescription(days: number): string {
	if (days <= 0) {
		return 'Expired'
	}

	if (days <= 30) {
		return `In ${days} day${days === 1 ? '' : 's'}`
	}

	if (days <= 365) {
		const months = Math.ceil(days / 30)
		return `In ${months} month${months === 1 ? '' : 's'}`
	}

	return `In ${Math.ceil(days / 365)} year${Math.ceil(days / 365) === 1 ? '' : 's'}`
}

export function buildUpcomingItems(input: {
	documents: ChronicleDocument[]
	insuranceKnowledge: InsuranceKnowledge | null
	reports: UploadedHealthReport[]
	members: FamilyMemberWithAliases[]
	limit?: number
}): UpcomingItem[] {
	const items: UpcomingItem[] = []

	for (const document of documentsExpiringWithin(input.documents, 365)) {
		if (!document.expiry_date) {
			continue
		}

		const days = daysUntil(document.expiry_date)
		items.push({
			id: `upcoming-doc-${document.id}`,
			title: document.title,
			description: formatExpiryDescription(days),
			daysUntil: days,
			module: 'documents',
			path: documentPath(document.id),
			emoji: document.category_id === 'identity' ? '🛂' : '📄',
		})
	}

	for (const policy of input.insuranceKnowledge?.expiringPolicies ?? []) {
		if (policy.daysUntilExpiry == null) {
			continue
		}

		items.push({
			id: `upcoming-policy-${policy.id}`,
			title: policy.productName ?? policy.policyNumber,
			description: `Insurance renewal ${formatExpiryDescription(policy.daysUntilExpiry).toLowerCase()}`,
			daysUntil: policy.daysUntilExpiry,
			module: 'insurance',
			path: ROUTES.insurancePolicies,
			emoji: '🛡️',
		})
	}

	const completedReports = input.reports.filter(
		(report) => report.status === 'completed',
	)
	const latestReport = [...completedReports].sort(
		(a, b) =>
			Date.parse(b.report_date ?? b.uploaded_at) -
			Date.parse(a.report_date ?? a.uploaded_at),
	)[0]

	if (latestReport) {
		const daysSinceLatest = Math.floor(
			(Date.now() -
				Date.parse(latestReport.report_date ?? latestReport.uploaded_at)) /
				(1000 * 60 * 60 * 24),
		)

		if (daysSinceLatest > 365) {
			items.push({
				id: 'upcoming-health-check',
				title: 'Health check recommended',
				description: 'Last report over a year ago',
				daysUntil: null,
				module: 'health',
				path: ROUTES.healthReports,
				emoji: '❤️',
			})
		}
	}

	return items
		.sort((left, right) => {
			if (left.daysUntil == null && right.daysUntil == null) {
				return 0
			}

			if (left.daysUntil == null) {
				return 1
			}

			if (right.daysUntil == null) {
				return -1
			}

			return left.daysUntil - right.daysUntil
		})
		.slice(0, input.limit ?? 5)
}

export function buildRecentActivity(input: {
	documents: ChronicleDocument[]
	reports: UploadedHealthReport[]
	insuranceKnowledge: InsuranceKnowledge | null
	limit?: number
}): import('@/features/os/types/os.types').RecentActivityItem[] {
	const items: import('@/features/os/types/os.types').RecentActivityItem[] = []

	for (const report of input.reports
		.filter((entry) => entry.status === 'completed')
		.slice(0, 5)) {
		const timestamp = report.processed_at ?? report.uploaded_at
		items.push({
			id: `activity-report-${report.id}`,
			title: 'Health report added',
			subtitle: getReportDisplayTitle(report),
			timestamp,
			relativeLabel: formatRelative(timestamp),
			module: 'health',
			path: healthReportPath(report.id),
			emoji: '❤️',
		})
	}

	for (const document of [...input.documents]
		.sort((a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at))
		.slice(0, 5)) {
		items.push({
			id: `activity-doc-${document.id}`,
			title: 'Document added',
			subtitle: document.title,
			timestamp: document.uploaded_at,
			relativeLabel: formatRelative(document.uploaded_at),
			module: 'documents',
			path: documentPath(document.id),
			emoji: '📄',
		})
	}

	for (const event of (input.insuranceKnowledge?.timeline ?? []).slice(0, 5)) {
		if (
			!['policy_renewed', 'policy_purchased', 'premium_paid'].includes(
				event.type,
			)
		) {
			continue
		}

		const label =
			event.type === 'policy_renewed'
				? 'Insurance renewed'
				: event.type === 'policy_purchased'
					? 'Policy added'
					: 'Premium paid'

		items.push({
			id: `activity-insurance-${event.id}`,
			title: label,
			subtitle: event.title,
			timestamp: event.date,
			relativeLabel: formatRelative(event.date),
			module: 'insurance',
			path: ROUTES.insuranceTimeline,
			emoji: '🛡️',
		})
	}

	return items
		.sort(
			(left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
		)
		.slice(0, input.limit ?? 6)
}

function formatRelative(timestamp: string): string {
	const date = new Date(timestamp)
	const diffDays = Math.floor(
		(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
	)

	if (diffDays <= 0) {
		return 'Today'
	}

	if (diffDays === 1) {
		return 'Yesterday'
	}

	if (diffDays < 7) {
		return `${diffDays} days ago`
	}

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
