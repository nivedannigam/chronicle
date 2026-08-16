import { documentPath, healthReportPath, ROUTES } from '@/constants/routes'
import type {
	ChronicleTimelineEvent,
	TimelineModule,
} from '@/features/timeline/types/timeline.types'

const MODULE_EMOJI: Record<TimelineModule, string> = {
	health: '❤️',
	insurance: '🛡️',
	vehicles: '🚗',
	documents: '📄',
	finance: '💰',
	travel: '✈️',
	family: '👨‍👩‍👧',
	system: '⚙️',
}

export function getTimelineModuleEmoji(module: TimelineModule): string {
	return MODULE_EMOJI[module]
}

export function resolveTimelineEventPath(
	event: ChronicleTimelineEvent,
): string {
	const reportAsset = event.relatedAssets.find(
		(asset) => asset.type === 'report',
	)

	if (reportAsset) {
		return healthReportPath(reportAsset.id)
	}

	const documentAsset = event.relatedAssets.find(
		(asset) => asset.type === 'document',
	)

	if (documentAsset) {
		return documentPath(documentAsset.id)
	}

	if (event.metadata.policyId) {
		return ROUTES.insurancePolicies
	}

	if (event.metadata.claimId) {
		return ROUTES.insuranceClaims
	}

	switch (event.sourceModule) {
		case 'health':
			return ROUTES.health
		case 'insurance':
			return ROUTES.insuranceTimeline
		case 'documents':
			return ROUTES.documents
		default:
			return ROUTES.timeline
	}
}

export function formatTimelineRelativeLabel(timestamp: string): string {
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

	if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7)
		return `${weeks} week${weeks === 1 ? '' : 's'} ago`
	}

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
