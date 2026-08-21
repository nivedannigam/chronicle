import { useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { buildFinanceKnowledge } from '@/features/finance-knowledge'
import { FinanceContext } from '@/features/finance/context/finance-context'
import { useFinanceKnowledge } from '@/features/finance/hooks/useFinanceKnowledge'
import { useFinanceSources } from '@/features/finance/hooks/useFinanceSources'
import { buildFinanceContextValue } from '@/features/finance/services/finance-context.builder'

export function FinanceProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember } = useFamilyContext()
	const sources = useFinanceSources(userId)
	const { knowledge, isLoading, isError, refetch } = useFinanceKnowledge({
		hasFolderAssigned: sources.hasFolderAssigned,
	})

	const value = useMemo(() => {
		const resolvedKnowledge =
			knowledge ??
			buildFinanceKnowledge({
				userId: userId ?? '',
				documents: [],
				members: [],
				hasFolderAssigned: sources.hasFolderAssigned,
			})

		return buildFinanceContextValue({
			knowledge: resolvedKnowledge,
			hasFolderAssigned: sources.hasFolderAssigned,
			isLoading: isLoading || sources.isLoading,
			isError,
			refetch,
			selectedMemberName: selectedMember?.displayName ?? null,
		})
	}, [
		knowledge,
		userId,
		sources.hasFolderAssigned,
		sources.isLoading,
		isLoading,
		isError,
		refetch,
		selectedMember?.displayName,
	])

	return (
		<FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
	)
}
