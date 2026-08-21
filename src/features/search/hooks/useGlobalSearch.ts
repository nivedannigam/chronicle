import { useDeferredValue, useMemo } from 'react'
import { useAuth } from '@/features/auth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { useFinanceKnowledge } from '@/features/finance/hooks/useFinanceKnowledge'
import { useFinanceSources } from '@/features/finance/hooks/useFinanceSources'
import { useIdentityKnowledge } from '@/features/identity/hooks/useIdentityKnowledge'
import { useVehicleKnowledge } from '@/features/vehicles/hooks/useVehicleKnowledge'
import { usePropertyKnowledge } from '@/features/property/hooks/usePropertyKnowledge'
import { usePropertySources } from '@/features/property/hooks/usePropertySources'
import { searchChronicle } from '@/features/search/services/global-search.service'
import type { SearchContextModule } from '@/features/search/services/search-context.service'

export function useGlobalSearch(
	query: string,
	searchContext: SearchContextModule | null = null,
) {
	const { user } = useAuth()
	const deferredQuery = useDeferredValue(query)
	const { selectedMemberId, selectedMember, members } = useFamilyContext()
	const reportsQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
	const insuranceQuery = useInsuranceKnowledge()
	const financeQuery = useFinanceKnowledge()
	const financeSources = useFinanceSources(user?.id)
	const vehicleQuery = useVehicleKnowledge()
	const identityQuery = useIdentityKnowledge()
	const propertySources = usePropertySources(user?.id)
	const propertyQuery = usePropertyKnowledge({
		hasFolderAssigned: propertySources.hasFolderAssigned,
		rootFolderPath: propertySources.rootFolderPath,
	})
	const driveConnector = useGoogleDriveConnector(user?.id ?? '')

	const memberContext = useMemo(
		() => ({
			memberId: selectedMemberId,
			memberName: selectedMember?.displayName ?? null,
			familyMemberNames: members.map((member) => member.displayName),
		}),
		[members, selectedMember?.displayName, selectedMemberId],
	)

	const results = useMemo(() => {
		if (!user?.id || !deferredQuery.trim()) return []

		return searchChronicle({
			query: deferredQuery,
			userId: user.id,
			member: memberContext,
			uploadedReports: reportsQuery.data ?? [],
			documents: documentsQuery.data ?? [],
			connectorDocuments: driveConnector.registry ?? [],
			insuranceKnowledge: insuranceQuery.knowledge,
			financeKnowledge: financeQuery.knowledge,
			identityKnowledge: identityQuery.knowledge,
			vehicleKnowledge: vehicleQuery.knowledge,
			propertyKnowledge: propertyQuery.knowledge,
			searchContext,
		})
	}, [
		deferredQuery,
		documentsQuery.data,
		driveConnector.registry,
		insuranceQuery.knowledge,
		financeQuery.knowledge,
		identityQuery.knowledge,
		vehicleQuery.knowledge,
		propertyQuery.knowledge,
		searchContext,
		memberContext,
		reportsQuery.data,
		user,
	])

	const isPending = query !== deferredQuery

	return {
		results,
		isLoading:
			isPending ||
			reportsQuery.isLoading ||
			documentsQuery.isLoading ||
			insuranceQuery.isLoading ||
			financeQuery.isLoading ||
			financeSources.isLoading ||
			vehicleQuery.isLoading ||
			identityQuery.isLoading ||
			propertyQuery.isLoading ||
			propertySources.isLoading,
	}
}
