import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import {
	buildIdentityKnowledge,
	type IdentityKnowledge,
} from '@/features/identity-knowledge'

export function useIdentityKnowledge(): {
	knowledge: IdentityKnowledge | null
	isLoading: boolean
	isError: boolean
	refetch: () => void
} {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { members, accountOwnerMemberId } = useFamilyContext()
	const documentsQuery = useMemberDocuments()

	const knowledge = useMemo(() => {
		if (!userId) {
			return null
		}

		return buildIdentityKnowledge({
			userId,
			documents: documentsQuery.allDocuments,
			members,
			accountOwnerMemberId,
		})
	}, [userId, documentsQuery.allDocuments, members, accountOwnerMemberId])

	return {
		knowledge,
		isLoading: documentsQuery.isLoading,
		isError: documentsQuery.isError,
		refetch: documentsQuery.refetch,
	}
}
