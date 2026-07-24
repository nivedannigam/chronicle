import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	hasPendingProcessing,
	processPendingHealthReports,
} from '@/features/health/services/health-processing.service'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'
import {
	queryKeys,
	STALE_TIME,
	uploadedHealthReportsQueryKey,
} from '@/lib/query-keys'

export { uploadedHealthReportsQueryKey }

export function useUploadedHealthReports(userId: string | undefined) {
	const query = useQuery({
		queryKey: queryKeys.health.reports(userId),
		queryFn: fetchUploadedHealthReports,
		enabled: Boolean(userId),
		staleTime: STALE_TIME.reports,
		refetchInterval: (currentQuery) => {
			const reports = currentQuery.state.data

			if (!reports || !hasPendingProcessing(reports)) {
				return false
			}

			return 2000
		},
	})

	const { data, refetch } = query

	useEffect(() => {
		if (!data || !hasPendingProcessing(data)) {
			return
		}

		void processPendingHealthReports(data).then(() => {
			void refetch()
		})
	}, [data, refetch])

	return query
}
