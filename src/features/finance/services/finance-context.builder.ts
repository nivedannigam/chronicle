import type {
	FinanceHomeViewModel,
	FinanceKnowledge,
	FinanceSetupStatus,
} from '@/features/finance-knowledge/types/finance-knowledge.types'
import { buildFinanceHomeViewModel } from '@/features/finance-knowledge'

export interface FinanceContextValue {
	knowledge: FinanceKnowledge
	home: FinanceHomeViewModel
	setupStatus: FinanceSetupStatus
	hasFolderAssigned: boolean
	isLoading: boolean
	isError: boolean
	refetch: () => void
}

export function buildFinanceContextValue(input: {
	knowledge: FinanceKnowledge
	hasFolderAssigned: boolean
	isLoading: boolean
	isError: boolean
	refetch: () => void
	selectedMemberName?: string | null
}): FinanceContextValue {
	return {
		knowledge: input.knowledge,
		setupStatus: input.knowledge.setupStatus,
		hasFolderAssigned: input.hasFolderAssigned,
		isLoading: input.isLoading,
		isError: input.isError,
		refetch: input.refetch,
		home: buildFinanceHomeViewModel({
			knowledge: input.knowledge,
			selectedMemberName: input.selectedMemberName ?? null,
		}),
	}
}
