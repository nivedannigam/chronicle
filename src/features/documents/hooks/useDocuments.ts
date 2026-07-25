import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { listDocuments } from '@/features/documents/services/document.service'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useDocuments() {
	const { user } = useAuth()
	const userId = user?.id

	return useQuery({
		queryKey: queryKeys.documents.list(userId),
		queryFn: () => listDocuments(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.documents,
	})
}
