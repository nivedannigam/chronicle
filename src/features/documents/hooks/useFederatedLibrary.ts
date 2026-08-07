import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { buildFederatedLibraryView } from '@/core/platform/services/federated-library.service'
import type { FederatedLibraryView } from '@/core/platform/contracts/module-provider.contract'

export function useFederatedLibrary(): FederatedLibraryView & {
	isLoading: boolean
} {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { members } = useFamilyContext()
	const documentsQuery = useDocuments()
	const reportsQuery = useUploadedHealthReports(userId)
	const insuranceQuery = useInsuranceKnowledge()

	const memberNames = useMemo(() => {
		const map: Record<string, string> = {}

		for (const member of members) {
			map[member.id] = member.displayName
		}

		return map
	}, [members])

	const view = useMemo(
		() =>
			buildFederatedLibraryView({
				userId,
				memberNames,
				sources: {
					health: { uploadedReports: reportsQuery.data ?? [] },
					documents: { uploadedDocuments: documentsQuery.data ?? [] },
					insurance: { knowledge: insuranceQuery.knowledge },
				},
			}),
		[
			userId,
			memberNames,
			reportsQuery.data,
			documentsQuery.data,
			insuranceQuery.knowledge,
		],
	)

	return {
		...view,
		isLoading:
			documentsQuery.isLoading ||
			reportsQuery.isLoading ||
			insuranceQuery.isLoading,
	}
}
