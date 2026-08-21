import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import {
	buildFinanceKnowledge,
	type FinanceKnowledge,
} from '@/features/finance-knowledge'

export function useFinanceKnowledge(input?: { hasFolderAssigned?: boolean }): {
	knowledge: FinanceKnowledge | null
	isLoading: boolean
	isError: boolean
	refetch: () => void
} {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { members, selectedMemberId } = useFamilyContext()
	const documentsQuery = useMemberDocuments()

	const knowledge = useMemo(() => {
		if (!userId) {
			return null
		}

		return buildFinanceKnowledge({
			userId,
			documents: documentsQuery.allDocuments,
			members,
			hasFolderAssigned: input?.hasFolderAssigned ?? false,
			isLoading: documentsQuery.isLoading,
			selectedMemberId,
		})
	}, [
		userId,
		documentsQuery.allDocuments,
		documentsQuery.isLoading,
		members,
		input?.hasFolderAssigned,
		selectedMemberId,
	])

	return {
		knowledge,
		isLoading: documentsQuery.isLoading,
		isError: documentsQuery.isError,
		refetch: documentsQuery.refetch,
	}
}
