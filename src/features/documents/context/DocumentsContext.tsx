import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { buildDocumentsHubView } from '@/features/documents/services/document-intelligence.service'
import { extractAvailableYears } from '@/features/documents/services/document-library.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { DocumentsHubView } from '@/features/documents/types/document-intelligence.types'

export interface DocumentsContextValue {
	documents: ChronicleDocument[]
	allDocuments: ChronicleDocument[]
	hub: DocumentsHubView
	memberNames: Record<string, string>
	availableYears: number[]
	isLoading: boolean
	isError: boolean
	refetch: () => void
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

export function DocumentsProvider({ children }: { children: ReactNode }) {
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

	const availableYears = useMemo(
		() => extractAvailableYears(allDocuments),
		[allDocuments],
	)

	const value = useMemo(
		() => ({
			documents,
			allDocuments,
			hub,
			memberNames,
			availableYears,
			isLoading,
			isError,
			refetch,
		}),
		[
			allDocuments,
			availableYears,
			documents,
			hub,
			isError,
			isLoading,
			memberNames,
			refetch,
		],
	)

	return (
		<DocumentsContext.Provider value={value}>
			{children}
		</DocumentsContext.Provider>
	)
}

export function useDocumentsContext(): DocumentsContextValue {
	const context = useContext(DocumentsContext)

	if (!context) {
		throw new Error('useDocumentsContext must be used within DocumentsProvider')
	}

	return context
}

export function useDocumentsContextOptional(): DocumentsContextValue | null {
	return useContext(DocumentsContext)
}
