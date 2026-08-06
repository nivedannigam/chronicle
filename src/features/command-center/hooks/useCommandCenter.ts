import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { buildCommandCenterBriefing } from '@/features/command-center/services/command-center.service'
import { useUser } from '@/features/user/hooks/useUser'

export function useCommandCenter() {
	const { user } = useAuth()
	const userId = user?.id
	const { profile } = useUser()
	const { family, members, isLoading: familyLoading } = useFamilyContext()
	const reportsQuery = useUploadedHealthReports(userId)
	const documentsQuery = useDocuments()
	const importStatus = useHealthImportStatus(userId)
	const insuranceQuery = useInsuranceKnowledge()
	const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data])
	const documents = useMemo(
		() => documentsQuery.data ?? [],
		[documentsQuery.data],
	)
	const { graph } = useHealthKnowledge(userId, reports)

	const loading = useMemo(
		() => ({
			family: familyLoading,
			health: reportsQuery.isLoading,
			documents: documentsQuery.isLoading,
			timeline: reportsQuery.isLoading || documentsQuery.isLoading,
		}),
		[familyLoading, reportsQuery.isLoading, documentsQuery.isLoading],
	)

	return useMemo(
		() =>
			buildCommandCenterBriefing({
				userId: userId ?? '',
				profileName: profile?.name,
				familyName: family?.name,
				members,
				reports,
				documents,
				metricHistories: graph.profile.metricHistories,
				importStatus: importStatus.data,
				insuranceKnowledge: insuranceQuery.knowledge,
				loading,
			}),
		[
			userId,
			profile?.name,
			family?.name,
			members,
			reports,
			documents,
			graph.profile.metricHistories,
			importStatus.data,
			insuranceQuery.knowledge,
			loading,
		],
	)
}
