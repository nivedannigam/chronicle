import { useMemo } from 'react'
import { useDocumentsContextOptional } from '@/features/documents/context/DocumentsContext'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { buildDocumentsHubView } from '@/features/documents/services/document-intelligence.service'

export function useDocumentIntelligence() {
	const context = useDocumentsContextOptional()
	const memberDocuments = useMemberDocuments()
	const { members } = useFamilyContext()

	const memberNames = useMemo(() => {
		if (context) {
			return context.memberNames
		}

		const map: Record<string, string> = {}
		for (const member of members) {
			map[member.id] = member.displayName
		}
		return map
	}, [context, members])

	const hub = useMemo(() => {
		if (context) {
			return context.hub
		}

		return buildDocumentsHubView({
			documents: memberDocuments.data ?? [],
			memberNames,
		})
	}, [context, memberDocuments.data, memberNames])

	if (context) {
		return {
			documents: context.documents,
			allDocuments: context.allDocuments,
			hub,
			memberNames,
			isLoading: context.isLoading,
			isError: context.isError,
			refetch: context.refetch,
		}
	}

	return {
		documents: memberDocuments.data ?? [],
		allDocuments: memberDocuments.allDocuments,
		hub,
		memberNames,
		isLoading: memberDocuments.isLoading,
		isError: memberDocuments.isError,
		refetch: memberDocuments.refetch,
	}
}
