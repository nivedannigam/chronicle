import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useCommandCenter } from '@/features/command-center/hooks/useCommandCenter'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { buildChronicleOsHome } from '@/features/os/services/os-home.service'
import type { ChronicleOsHome } from '@/features/os/types/os.types'

export function useChronicleOs(): ChronicleOsHome & {
	loading: boolean
	attentionItems: import('@/features/command-center/types/command-center.types').AttentionItem[]
	timelinePreview: import('@/features/timeline/types/timeline.types').ChronicleTimelineEvent[]
} {
	const { user } = useAuth()
	const userId = user?.id
	const briefing = useCommandCenter()
	const { members } = useFamilyContext()
	const reportsQuery = useUploadedHealthReports(userId)
	const documentsQuery = useDocuments()
	const insuranceQuery = useInsuranceKnowledge()
	const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data])
	const documents = useMemo(
		() => documentsQuery.data ?? [],
		[documentsQuery.data],
	)
	const { graph } = useHealthKnowledge(userId, reports)

	const osHome = useMemo(
		() =>
			buildChronicleOsHome({
				briefing,
				metricHistories: graph.profile.metricHistories,
				insuranceKnowledge: insuranceQuery.knowledge,
				documents,
				reports,
				members,
				notificationCount: briefing.attentionItems.filter(
					(item) => item.tone !== 'info',
				).length,
			}),
		[
			briefing,
			graph.profile.metricHistories,
			insuranceQuery.knowledge,
			documents,
			reports,
			members,
		],
	)

	const loading =
		briefing.loading.family ||
		briefing.loading.health ||
		briefing.loading.documents ||
		insuranceQuery.isLoading

	return {
		...osHome,
		loading,
		attentionItems: briefing.attentionItems,
		timelinePreview: briefing.timelinePreview,
	}
}
