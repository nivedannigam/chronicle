import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import {
	buildPropertyKnowledge,
	type PropertyKnowledge,
} from '@/features/property-knowledge'

export function usePropertyKnowledge(input?: {
	hasFolderAssigned?: boolean
	rootFolderPath?: string | null
}): {
	knowledge: PropertyKnowledge | null
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

		return buildPropertyKnowledge({
			userId,
			documents: documentsQuery.allDocuments,
			members,
			hasFolderAssigned: input?.hasFolderAssigned ?? false,
			rootFolderPath: input?.rootFolderPath ?? null,
			selectedMemberId,
		})
	}, [
		userId,
		documentsQuery.allDocuments,
		members,
		input?.hasFolderAssigned,
		input?.rootFolderPath,
		selectedMemberId,
	])

	return {
		knowledge,
		isLoading: documentsQuery.isLoading,
		isError: documentsQuery.isError,
		refetch: documentsQuery.refetch,
	}
}
