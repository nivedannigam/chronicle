import type {
	PropertyHomeViewModel,
	PropertyKnowledge,
	PropertySetupStatus,
} from '@/features/property-knowledge/types/property-knowledge.types'
import { buildPropertyHomeViewModel } from '@/features/property-knowledge'

export interface PropertyContextValue {
	knowledge: PropertyKnowledge
	home: PropertyHomeViewModel
	setupStatus: PropertySetupStatus
	hasFolderAssigned: boolean
	isLoading: boolean
	isError: boolean
	refetch: () => void
}

export function buildPropertyContextValue(input: {
	knowledge: PropertyKnowledge
	hasFolderAssigned: boolean
	isLoading: boolean
	isError: boolean
	refetch: () => void
}): PropertyContextValue {
	return {
		knowledge: input.knowledge,
		setupStatus: input.knowledge.setupStatus,
		hasFolderAssigned: input.hasFolderAssigned,
		isLoading: input.isLoading,
		isError: input.isError,
		refetch: input.refetch,
		home: buildPropertyHomeViewModel({ knowledge: input.knowledge }),
	}
}
