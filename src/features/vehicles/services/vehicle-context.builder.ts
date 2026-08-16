import type { VehicleHomeViewModel } from '@/features/vehicles/services/vehicle-home.mapper'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import { buildVehicleHomeViewModel } from '@/features/vehicles/services/vehicle-home.mapper'

export interface VehicleContextValue {
	knowledge: VehicleKnowledge
	home: VehicleHomeViewModel
	hasVehicles: boolean
	setupStatus: 'connect_folder' | 'scanning' | 'ready'
	isLoading: boolean
	isError: boolean
	refetch: () => void
}

export function buildVehicleContextValue(input: {
	knowledge: VehicleKnowledge
	isLoading: boolean
	isError: boolean
	refetch: () => void
	hasFolderAssigned: boolean
	isProcessing: boolean
}): VehicleContextValue {
	const home = buildVehicleHomeViewModel(input.knowledge)

	let setupStatus: VehicleContextValue['setupStatus'] = 'ready'

	if (!input.hasFolderAssigned) {
		setupStatus = 'connect_folder'
	} else if (input.isProcessing || !input.knowledge.hasVehicles) {
		setupStatus = 'scanning'
	}

	return {
		knowledge: input.knowledge,
		home,
		hasVehicles: input.knowledge.hasVehicles,
		setupStatus,
		isLoading: input.isLoading,
		isError: input.isError,
		refetch: input.refetch,
	}
}
