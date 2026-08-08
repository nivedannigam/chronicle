import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { filterReportsForMember } from '@/features/family/utils/member-display'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import type { FederatedLibraryView } from '@/core/platform/contracts/module-provider.contract'
import {
	buildLibraryHubView,
	buildModuleProviderQuery,
} from '@/core/platform/services/federated-library.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { DocumentsHubView } from '@/features/documents/types/document-intelligence.types'

export interface DocumentsContextValue {
	documents: ChronicleDocument[]
	allDocuments: ChronicleDocument[]
	hub: DocumentsHubView
	federated: FederatedLibraryView
	memberNames: Record<string, string>
	availableYears: number[]
	isLoading: boolean
	isError: boolean
	refetch: () => void
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

export function DocumentsProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const userId = user?.id
	const {
		data: documents = [],
		isLoading: documentsLoading,
		isError,
		refetch,
		allDocuments,
	} = useMemberDocuments()
	const { members, selectedMemberId, accountOwnerMemberId } = useFamilyContext()
	const reportsQuery = useUploadedHealthReports(userId)
	const insuranceQuery = useInsuranceKnowledge()

	const memberNames = useMemo(() => {
		const map: Record<string, string> = {}

		for (const member of members) {
			map[member.id] = member.displayName
		}

		return map
	}, [members])

	const healthReports = useMemo(() => {
		const allReports = reportsQuery.data ?? []

		if (!selectedMemberId) {
			return allReports
		}

		return filterReportsForMember(
			allReports,
			selectedMemberId,
			accountOwnerMemberId,
		)
	}, [reportsQuery.data, selectedMemberId, accountOwnerMemberId])

	const chronicleDocumentsForQuery = useMemo(() => {
		if (!selectedMemberId) {
			return allDocuments
		}

		return documents
	}, [allDocuments, documents, selectedMemberId])

	const { hub, federated } = useMemo(() => {
		const query = buildModuleProviderQuery({
			userId: userId ?? '',
			memberId: selectedMemberId,
			memberNames,
			healthReports,
			chronicleDocuments: chronicleDocumentsForQuery,
			insuranceKnowledge: insuranceQuery.knowledge,
		})

		return buildLibraryHubView({
			query,
			chronicleDocuments: chronicleDocumentsForQuery,
		})
	}, [
		userId,
		memberNames,
		healthReports,
		chronicleDocumentsForQuery,
		selectedMemberId,
		insuranceQuery.knowledge,
	])

	const availableYears = useMemo(
		() =>
			[
				...new Set(
					federated.allDocuments
						.map((document) => document.year)
						.filter((year): year is number => year != null),
				),
			].sort((a, b) => b - a),
		[federated.allDocuments],
	)

	const isLoading =
		documentsLoading || reportsQuery.isLoading || insuranceQuery.isLoading

	const value = useMemo(
		() => ({
			documents,
			allDocuments,
			hub,
			federated,
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
			federated,
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
