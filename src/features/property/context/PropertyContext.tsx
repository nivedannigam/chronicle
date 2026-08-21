import { useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { PropertyContext } from '@/features/property/context/property-context'
import { usePropertyKnowledge } from '@/features/property/hooks/usePropertyKnowledge'
import { usePropertySources } from '@/features/property/hooks/usePropertySources'
import { buildPropertyContextValue } from '@/features/property/services/property-context.builder'
import { buildPropertyKnowledge } from '@/features/property-knowledge'
import { useFamilyContext } from '@/features/family/context/FamilyContext'

export function PropertyProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const userId = user?.id
	const { members, selectedMemberId } = useFamilyContext()
	const sources = usePropertySources(userId)
	const { knowledge, isLoading, isError, refetch } = usePropertyKnowledge({
		hasFolderAssigned: sources.hasFolderAssigned,
		rootFolderPath: sources.rootFolderPath,
	})

	const value = useMemo(() => {
		const resolvedKnowledge =
			knowledge ??
			buildPropertyKnowledge({
				userId: userId ?? '',
				documents: [],
				members,
				hasFolderAssigned: sources.hasFolderAssigned,
				rootFolderPath: sources.rootFolderPath,
				selectedMemberId,
			})

		return buildPropertyContextValue({
			knowledge: resolvedKnowledge,
			hasFolderAssigned: sources.hasFolderAssigned,
			isLoading: isLoading || sources.isLoading,
			isError,
			refetch,
		})
	}, [
		knowledge,
		userId,
		members,
		selectedMemberId,
		sources.hasFolderAssigned,
		sources.rootFolderPath,
		sources.isLoading,
		isLoading,
		isError,
		refetch,
	])

	return (
		<PropertyContext.Provider value={value}>
			{children}
		</PropertyContext.Provider>
	)
}
