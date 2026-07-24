import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { useHealthDashboard } from '@/features/health/hooks/useHealthDashboard'
import { useHealthDashboardSummary } from '@/features/health/hooks/useHealthDashboardSummary'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { buildHomeBriefing } from '@/features/home/services/home-briefing.service'
import { useUser } from '@/features/user/hooks/useUser'

export function useHomeBriefing() {
	const { user } = useAuth()
	const { profile } = useUser()
	const { family, members, selectedMember } = useFamilyContext()
	const setup = useHealthMemberSetup()
	const reportsQuery = useMemberHealthReports()
	const reports = reportsQuery.data ?? []
	const importStatus = useHealthImportStatus(user?.id)

	const { insights, knowledgeGraph } = useHealthDashboard(reports)
	const summary = useHealthDashboardSummary(user?.id, reports, knowledgeGraph)

	return useMemo(
		() =>
			buildHomeBriefing({
				profileName: profile?.name,
				selectedMemberName: selectedMember?.displayName,
				familyName: family?.name,
				members,
				insights,
				healthScore: summary.healthScore,
				reports,
				importStatus: importStatus.data,
				driveConnected: setup.driveConnected,
				isLoading:
					reportsQuery.isLoading || setup.isLoading || importStatus.isLoading,
			}),
		[
			profile?.name,
			selectedMember?.displayName,
			family?.name,
			members,
			insights,
			summary.healthScore,
			reports,
			importStatus.data,
			setup.driveConnected,
			setup.isLoading,
			reportsQuery.isLoading,
			importStatus.isLoading,
		],
	)
}
