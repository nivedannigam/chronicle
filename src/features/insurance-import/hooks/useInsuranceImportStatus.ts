import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getInsuranceImportStatus } from '@/features/insurance-import/services/insurance-import-runner.service'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useInsuranceImportStatus(userId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.insurance.importStatus(userId),
		queryFn: () => getInsuranceImportStatus(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.importStatus,
	})
}

export function useInsuranceImportStatusForUser() {
	const { user } = useAuth()

	return useInsuranceImportStatus(user?.id)
}
