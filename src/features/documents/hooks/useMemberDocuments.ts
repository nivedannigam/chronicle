import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { filterDocumentsForMember } from '@/features/documents/services/document.service'
import { useDocuments } from '@/features/documents/hooks/useDocuments'

export function useMemberDocuments() {
	const { user } = useAuth()
	const userId = user?.id
	const documentsQuery = useDocuments()
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()

	const filteredDocuments = useMemo(
		() =>
			filterDocumentsForMember(
				documentsQuery.data ?? [],
				selectedMemberId,
				accountOwnerMemberId,
			),
		[documentsQuery.data, selectedMemberId, accountOwnerMemberId],
	)

	return {
		...documentsQuery,
		data: filteredDocuments,
		allDocuments: documentsQuery.data ?? [],
		userId,
	}
}
