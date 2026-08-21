import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDocumentsContextOptional } from '@/features/documents/context/DocumentsContext'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import {
	buildLibraryHubView,
	buildModuleProviderQuery,
} from '@/core/platform/services/federated-library.service'

export function useDocumentIntelligence() {
	const context = useDocumentsContextOptional()
	const memberDocuments = useMemberDocuments()
	const { members, selectedMemberId } = useFamilyContext()
	const { user } = useAuth()
	const userId = user?.id
	const reportsQuery = useUploadedHealthReports(userId)
	const insuranceQuery = useInsuranceKnowledge()

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

		const query = buildModuleProviderQuery({
			userId: userId ?? '',
			memberId: selectedMemberId,
			memberNames,
			accountOwnerMemberId: null,
			healthReports: reportsQuery.data ?? [],
			chronicleDocuments: memberDocuments.data ?? [],
			insuranceKnowledge: insuranceQuery.knowledge,
		})

		return buildLibraryHubView({
			query,
			chronicleDocuments: memberDocuments.data ?? [],
		}).hub
	}, [
		context,
		userId,
		selectedMemberId,
		memberNames,
		reportsQuery.data,
		memberDocuments.data,
		insuranceQuery.knowledge,
	])

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
		isLoading:
			memberDocuments.isLoading ||
			reportsQuery.isLoading ||
			insuranceQuery.isLoading,
		isError:
			memberDocuments.isError || reportsQuery.isError || insuranceQuery.isError,
		refetch: () => {
			void memberDocuments.refetch()
			void reportsQuery.refetch()
			void insuranceQuery.refetch()
		},
	}
}
