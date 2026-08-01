import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useHealthMetrics } from '@/features/health/hooks/useHealthMetrics'
import { buildHealthCoverageSnapshot } from '@/features/health/services/health-coverage.service'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

const GOOGLE_DRIVE = 'google-drive'

export function useHealthCoverage(options?: {
	memberId?: string | null
	uploadedReports?: UploadedHealthReport[]
}): HealthCoverageSnapshot {
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()
	const uploadedQuery = useMemberHealthReports()
	const metricsQuery = useHealthMetrics()

	const registryQuery = useQuery({
		queryKey: queryKeys.connectors.registry(userId, GOOGLE_DRIVE),
		queryFn: () => listRegistryRecords(userId!, GOOGLE_DRIVE),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.connectorRegistry,
	})

	const reports = options?.uploadedReports ?? uploadedQuery.data ?? []
	const memberId = options?.memberId ?? selectedMemberId

	return useMemo(
		() =>
			buildHealthCoverageSnapshot({
				uploadedReports: reports,
				importRegistry: registryQuery.data ?? [],
				storedMetrics: metricsQuery.data ?? [],
				memberId,
				accountOwnerMemberId,
			}),
		[
			reports,
			registryQuery.data,
			metricsQuery.data,
			memberId,
			accountOwnerMemberId,
		],
	)
}
