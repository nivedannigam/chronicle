import { useQuery } from '@tanstack/react-query'
import { getHealthWorkflowProjection } from '@/features/health/workflow'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useHealthWorkflowProjection(userId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.health.workflow(userId),
		queryFn: () => getHealthWorkflowProjection(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.importStatus,
	})
}
