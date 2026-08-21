import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { useVehicleKnowledge } from '@/features/vehicles/hooks/useVehicleKnowledge'
import { buildIdentityKnowledge } from '@/features/identity-knowledge'
import { buildFinanceKnowledge } from '@/features/finance-knowledge'
import { buildPropertyKnowledge } from '@/features/property-knowledge'
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
	const vehicleQuery = useVehicleKnowledge()

	const memberNames = useMemo(() => {
		const map: Record<string, string> = {}

		for (const member of members) {
			map[member.id] = member.displayName
		}

		return map
	}, [members])

	const healthReports = reportsQuery.data ?? []

	const identityKnowledge = useMemo(() => {
		if (!userId) {
			return null
		}

		return buildIdentityKnowledge({
			userId,
			documents: allDocuments,
			members,
			accountOwnerMemberId,
		})
	}, [userId, allDocuments, members, accountOwnerMemberId])

	const financeKnowledge = useMemo(() => {
		if (!userId) {
			return null
		}

		return buildFinanceKnowledge({
			userId,
			documents: allDocuments,
			members,
			hasFolderAssigned: false,
			isLoading: documentsLoading,
			selectedMemberId,
		})
	}, [userId, allDocuments, members, documentsLoading, selectedMemberId])

	const propertyKnowledge = useMemo(() => {
		if (!userId) {
			return null
		}

		return buildPropertyKnowledge({
			userId,
			documents: allDocuments,
			members,
			hasFolderAssigned: false,
			rootFolderPath: null,
			selectedMemberId,
		})
	}, [userId, allDocuments, members, selectedMemberId])

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
			accountOwnerMemberId,
			healthReports,
			chronicleDocuments: chronicleDocumentsForQuery,
			insuranceKnowledge: insuranceQuery.knowledge,
			vehicleKnowledge: vehicleQuery.knowledge,
			identityKnowledge,
			financeKnowledge,
			propertyKnowledge,
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
		vehicleQuery.knowledge,
		identityKnowledge,
		financeKnowledge,
		propertyKnowledge,
		accountOwnerMemberId,
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
		documentsLoading ||
		reportsQuery.isLoading ||
		insuranceQuery.isLoading ||
		vehicleQuery.isLoading

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
