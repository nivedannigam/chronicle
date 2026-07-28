import { useMemo } from 'react'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { buildDocumentsHubView } from '@/features/documents/services/document-intelligence.service'

export function useDocumentIntelligence() {
	const {
		data: documents = [],
		isLoading,
		isError,
		refetch,
		allDocuments,
	} = useMemberDocuments()
	const { members } = useFamilyContext()

	const memberNames = useMemo(() => {
		const map: Record<string, string> = {}
		for (const member of members) {
			map[member.id] = member.displayName
		}
		return map
	}, [members])

	const hub = useMemo(
		() =>
			buildDocumentsHubView({
				documents,
				memberNames,
			}),
		[documents, memberNames],
	)

	return {
		documents,
		allDocuments,
		hub,
		memberNames,
		isLoading,
		isError,
		refetch,
	}
}
