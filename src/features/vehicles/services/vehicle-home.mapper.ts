import type {
	VehicleAttentionItem,
	VehicleKnowledge,
	VehicleKnowledgeVehicle,
} from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'

export interface VehicleCardViewModel {
	id: string
	slug: string
	displayName: string
	statusLabel: string
	categoryLabel: string
	registrationLabel: string | null
	insuranceLabel: string | null
	pucLabel: string | null
	serviceLabel: string | null
	documentCount: number
}

export interface VehicleHomeViewModel {
	headline: string
	summaryLines: string[]
	vehicleCards: VehicleCardViewModel[]
	attention: VehicleAttentionItem[]
	hasVehicles: boolean
}

function formatExpiryLabel(date: string | null, prefix: string): string | null {
	if (!date) {
		return null
	}

	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return null
	}

	return `${prefix} ${new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})}`
}

function mapVehicleCard(
	vehicle: VehicleKnowledgeVehicle,
): VehicleCardViewModel {
	return {
		id: vehicle.id,
		slug: vehicle.slug,
		displayName: vehicle.displayName,
		statusLabel: vehicle.statusLabel,
		categoryLabel: vehicle.categoryLabel,
		registrationLabel: vehicle.registrationNumber
			? `Registered · ${vehicle.registrationNumber}`
			: 'Registration not found yet',
		insuranceLabel: formatExpiryLabel(vehicle.insuranceExpiry, 'Valid until'),
		pucLabel: formatExpiryLabel(vehicle.pucExpiry, 'Valid until'),
		serviceLabel: vehicle.lastServiceDate
			? `Last service ${new Date(vehicle.lastServiceDate).toLocaleDateString(
					'en-US',
					{
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					},
				)}`
			: 'Service history not found yet',
		documentCount: vehicle.documentCount,
	}
}

export function buildVehicleHomeViewModel(
	knowledge: VehicleKnowledge,
): VehicleHomeViewModel {
	return {
		headline: knowledge.summary.headline,
		summaryLines: knowledge.summary.lines,
		vehicleCards: knowledge.vehicles.map(mapVehicleCard),
		attention: knowledge.attention.slice(0, 4),
		hasVehicles: knowledge.hasVehicles,
	}
}
