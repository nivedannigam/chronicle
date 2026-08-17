import type { VehicleAttentionItem } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { VehicleCurrentState } from '@/features/vehicle-knowledge/engines/vehicle-state.engine'
import type {
	VehicleDocumentRecord,
	VehicleTimelineRecord,
} from '@/features/vehicle-knowledge/types/vehicle-record.types'

export function buildVehicleAttention(input: {
	vehicles: Array<{
		id: string
		displayName: string
		currentState: VehicleCurrentState
	}>
	documents: VehicleDocumentRecord[]
	timeline: VehicleTimelineRecord[]
}): VehicleAttentionItem[] {
	const items: VehicleAttentionItem[] = []
	const seen = new Set<string>()

	function push(item: VehicleAttentionItem) {
		const key = `${item.vehicleId}-${item.severity}-${item.title}`
		if (seen.has(key)) return
		seen.add(key)
		items.push(item)
	}

	for (const vehicle of input.vehicles) {
		const { currentState } = vehicle

		if (currentState.insurance.status === 'expired') {
			push({
				id: `${vehicle.id}-insurance-expired`,
				vehicleId: vehicle.id,
				severity: 'high',
				title: `${vehicle.displayName} insurance expired`,
				body: currentState.insurance.sourceDocumentName
					? `Based on ${currentState.insurance.sourceDocumentName}.`
					: 'Renew your motor insurance to stay covered.',
				actionLabel: 'View insurance',
			})
		} else if (currentState.insurance.status === 'expiring_soon') {
			push({
				id: `${vehicle.id}-insurance-soon`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} insurance expires soon`,
				body: currentState.insurance.label,
				actionLabel: 'View insurance',
			})
		} else if (
			currentState.insurance.status === 'valid' &&
			hasRecentTimelineEvent(
				input.timeline,
				vehicle.id,
				'insurance_renewed',
				45,
			)
		) {
			push({
				id: `${vehicle.id}-insurance-renewed`,
				vehicleId: vehicle.id,
				severity: 'low',
				title: `${vehicle.displayName} insurance renewed`,
				body: currentState.insurance.label,
				actionLabel: 'View insurance',
			})
		}

		if (currentState.puc.status === 'expired') {
			push({
				id: `${vehicle.id}-puc-expired`,
				vehicleId: vehicle.id,
				severity: 'high',
				title: `${vehicle.displayName} PUC expired`,
				body: currentState.puc.sourceDocumentName
					? `Based on ${currentState.puc.sourceDocumentName}.`
					: 'Renew your pollution certificate.',
				actionLabel: 'View compliance',
			})
		} else if (currentState.puc.status === 'expiring_soon') {
			push({
				id: `${vehicle.id}-puc-soon`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} PUC expires soon`,
				body: currentState.puc.label,
				actionLabel: 'View compliance',
			})
		} else if (
			currentState.puc.status === 'valid' &&
			hasRecentTimelineEvent(input.timeline, vehicle.id, 'puc_renewed', 45)
		) {
			push({
				id: `${vehicle.id}-puc-renewed`,
				vehicleId: vehicle.id,
				severity: 'low',
				title: `${vehicle.displayName} PUC renewed`,
				body: currentState.puc.label,
				actionLabel: 'View compliance',
			})
		}

		if (currentState.warranty.status === 'expiring_soon') {
			push({
				id: `${vehicle.id}-warranty-soon`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} warranty ending soon`,
				body: currentState.warranty.label,
				actionLabel: 'View warranty',
			})
		} else if (currentState.warranty.status === 'valid') {
			push({
				id: `${vehicle.id}-warranty-active`,
				vehicleId: vehicle.id,
				severity: 'low',
				title: `${vehicle.displayName} warranty active`,
				body: currentState.warranty.label,
				actionLabel: 'View warranty',
			})
		}

		if (currentState.service.status === 'overdue') {
			push({
				id: `${vehicle.id}-service-overdue`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} service overdue`,
				body: currentState.service.label,
				actionLabel: 'View service history',
			})
		} else if (currentState.service.status === 'due_soon') {
			push({
				id: `${vehicle.id}-service-due`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} service due soon`,
				body: currentState.service.label,
				actionLabel: 'View service history',
			})
		} else if (
			currentState.service.status === 'recent' &&
			hasRecentTimelineEvent(
				input.timeline,
				vehicle.id,
				'service_completed',
				45,
			)
		) {
			push({
				id: `${vehicle.id}-service-recent`,
				vehicleId: vehicle.id,
				severity: 'low',
				title: `${vehicle.displayName} recently serviced`,
				body: currentState.service.label,
				actionLabel: 'View service history',
			})
		}

		const hasRegistration = input.documents.some(
			(document) =>
				document.vehicleId === vehicle.id &&
				document.documentType === 'registration' &&
				document.status === 'completed',
		)
		const vehicleDocCount = input.documents.filter(
			(document) => document.vehicleId === vehicle.id,
		).length

		if (
			!hasRegistration &&
			vehicleDocCount > 0 &&
			currentState.registration.status === 'unknown'
		) {
			push({
				id: `${vehicle.id}-missing-rc`,
				vehicleId: vehicle.id,
				severity: 'high',
				title: `${vehicle.displayName} registration not found`,
				body: 'We have not found a registration certificate yet.',
				actionLabel: 'View documents',
			})
		}
	}

	return items.sort((left, right) => {
		const rank = { high: 0, medium: 1, low: 2 } as const
		return rank[left.severity] - rank[right.severity]
	})
}

function hasRecentTimelineEvent(
	timeline: VehicleTimelineRecord[],
	vehicleId: string,
	eventType: string,
	withinDays: number,
): boolean {
	const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000

	return timeline.some((event) => {
		if (event.vehicleId !== vehicleId || event.eventType !== eventType) {
			return false
		}

		const parsed = Date.parse(event.eventDate)
		return !Number.isNaN(parsed) && parsed >= cutoff
	})
}
