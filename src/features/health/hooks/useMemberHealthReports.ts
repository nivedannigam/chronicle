import { useMemo } from 'react'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { filterReportsForMember } from '@/features/family/utils/member-display'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function useMemberHealthReports() {
	const { user } = useAuth()
	const uploadedQuery = useUploadedHealthReports(user?.id)
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()

	const filteredReports = useMemo(
		() =>
			filterReportsForMember(
				uploadedQuery.data ?? [],
				selectedMemberId,
				accountOwnerMemberId,
			),
		[uploadedQuery.data, selectedMemberId, accountOwnerMemberId],
	)

	return {
		...uploadedQuery,
		data: filteredReports,
		allReports: uploadedQuery.data ?? [],
	}
}
