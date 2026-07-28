import { useDeferredValue, useMemo } from 'react'
import { useAuth } from '@/features/auth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { searchChronicle } from '@/features/search/services/global-search.service'

export function useGlobalSearch(query: string) {
	const { user } = useAuth()
	const deferredQuery = useDeferredValue(query)
	const { selectedMemberId, selectedMember, members } = useFamilyContext()
	const reportsQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
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
		})
	}, [
		deferredQuery,
		documentsQuery.data,
		driveConnector.registry,
		memberContext,
		reportsQuery.data,
		user,
	])

	const isPending = query !== deferredQuery

	return {
		results,
		isLoading: isPending || reportsQuery.isLoading || documentsQuery.isLoading,
	}
}
