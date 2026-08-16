import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth'
import { useVehicleKnowledge } from '@/features/vehicles/hooks/useVehicleKnowledge'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'
import { buildVehicleContextValue } from '@/features/vehicles/services/vehicle-context.builder'
import type { VehicleContextValue } from '@/features/vehicles/services/vehicle-context.builder'
import { vehicleKnowledgeProvider } from '@/features/vehicle-knowledge'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'

const VehicleContext = createContext<VehicleContextValue | null>(null)

function emptyKnowledge(userId: string): VehicleKnowledge {
	return vehicleKnowledgeProvider.buildFromRawData(
		{
			vehicles: [],
			documents: [],
			facts: [],
			timeline: [],
			familyMembers: [],
			importRegistry: [],
		},
		{ userId, familyMemberId: null, accountOwnerMemberId: null },
	)
}

export function VehicleProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const userId = user?.id
	const { knowledge, isLoading, isError, refetch } = useVehicleKnowledge()
	const sources = useVehicleSources(userId)

	const value = useMemo(() => {
		return buildVehicleContextValue({
			knowledge: knowledge ?? emptyKnowledge(userId ?? ''),
			isLoading: isLoading || sources.isLoading,
			isError,
			refetch: () => void refetch(),
			hasFolderAssigned: sources.assignments.length > 0,
			isProcessing: false,
		})
	}, [
		knowledge,
		userId,
		isLoading,
		sources.isLoading,
		sources.assignments.length,
		isError,
		refetch,
	])

	return (
		<VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>
	)
}

export function useVehicleContext(): VehicleContextValue {
	const context = useContext(VehicleContext)

	if (!context) {
		throw new Error('useVehicleContext must be used within VehicleProvider')
	}

	return context
}
