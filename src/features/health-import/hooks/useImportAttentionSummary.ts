import { useMemo } from 'react'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useFamilyMembers } from '@/features/family/hooks/useFamilyMembers'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import { useHealthImport } from '@/features/health-import/hooks/useHealthImport'
import {
	buildImportAttentionSummary,
	buildImportCenterViewModel,
} from '@/features/health-import/services/import-center.mapper'
import { buildSetupReportRows } from '@/features/health-import/utils/setup-report-list.utils'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { buildHealthVisits } from '@/features/health/services/health-visit.mapper'
import { useImportReview } from '@/features/medical-discovery/hooks/useImportReview'
import { useUser } from '@/features/user/hooks/useUser'

export function useImportAttentionSummary(userId: string | undefined) {
	const importState = useHealthImport(userId)
	const { data: reports = [] } = useMemberHealthReports()
	const review = useImportReview(userId)
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()
	const { profile } = useUser()
	const { members } = useFamilyMembers(userId, profile?.name ?? 'Me')

	return useMemo(() => {
		const memberOptions = dedupeFamilyMembers(members).map((member) => ({
			id: member.id,
			label: formatMemberLabel(member),
		}))

		const view = buildImportCenterViewModel({
			visits: buildHealthVisits(reports),
			setupRows: buildSetupReportRows({
				registry: importState.registry,
				reports,
				memberId: selectedMemberId,
				accountOwnerMemberId,
			}),
			reviewDocuments: review.documents,
			memberOptions,
		})

		return {
			...buildImportAttentionSummary({ view }),
			needsAttentionCount: view.needsAttentionCount,
		}
	}, [
		members,
		importState.registry,
		reports,
		selectedMemberId,
		accountOwnerMemberId,
		review.documents,
	])
}
