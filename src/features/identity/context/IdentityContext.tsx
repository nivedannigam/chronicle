import { useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { buildIdentityKnowledge } from '@/features/identity-knowledge'
import { IdentityContext } from '@/features/identity/context/identity-context'
import { useIdentityKnowledge } from '@/features/identity/hooks/useIdentityKnowledge'
import { useIdentitySources } from '@/features/identity/hooks/useIdentitySources'
import { buildIdentityContextValue } from '@/features/identity/services/identity-context.builder'

export function IdentityProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember, selectedMemberId } = useFamilyContext()
	const { knowledge, isLoading, isError, refetch } = useIdentityKnowledge()
	const sources = useIdentitySources(userId)

	const value = useMemo(() => {
		const resolvedKnowledge =
			knowledge ??
			buildIdentityKnowledge({
				userId: userId ?? '',
				documents: [],
				members: [],
				accountOwnerMemberId: null,
			})

		return buildIdentityContextValue({
			knowledge: resolvedKnowledge,
			hasFolderAssigned: sources.hasFolderAssigned,
			isLoading: isLoading || sources.isLoading,
			isError,
			refetch,
			selectedMemberId,
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
		selectedMemberId,
		selectedMember?.displayName,
	])

	return (
		<IdentityContext.Provider value={value}>
			{children}
		</IdentityContext.Provider>
	)
}
