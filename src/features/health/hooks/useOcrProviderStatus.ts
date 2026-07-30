import { useQuery } from '@tanstack/react-query'
import { fetchOcrProviderStatus } from '@/features/health/services/ocr-provider-status.service'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useOcrProviderStatus(userId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.health.ocrStatus(userId),
		queryFn: () => fetchOcrProviderStatus(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.importStatus,
	})
}
