import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { backfillHealthMetricsFromReports } from '@/features/health/services/health-metrics-persist.service'
import { backfillAiExtractionForIncompleteReports } from '@/features/health/services/health-ai-backfill.service'
import { fetchHealthMetricsForUser } from '@/features/health/services/health-metrics.service'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useHealthMetrics() {
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()

	return useQuery({
		queryKey: queryKeys.health.metrics(userId, selectedMemberId),
		queryFn: async () => {
			if (!userId) {
				return []
			}

			const allReports = await fetchUploadedHealthReports()

			if (allReports.length > 0) {
				await backfillAiExtractionForIncompleteReports(userId, allReports)
				await backfillHealthMetricsFromReports(userId, allReports)
			}

			return fetchHealthMetricsForUser(userId, {
				familyMemberId: selectedMemberId,
				accountOwnerMemberId,
			})
		},
		enabled: Boolean(userId),
		staleTime: STALE_TIME.reports,
	})
}
