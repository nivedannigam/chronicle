import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { buildUnifiedSearchResults } from '@/features/command-center/services/command-center.service'

export function useUnifiedSearch(query: string) {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const reportsQuery = useUploadedHealthReports(userId)
	const documentsQuery = useDocuments()
	const reports = reportsQuery.data ?? []
	const documents = documentsQuery.data ?? []

	return useMemo(
		() =>
			buildUnifiedSearchResults({
				query,
				reports,
				documents,
				userId,
			}),
		[query, reports, documents, userId],
	)
}
