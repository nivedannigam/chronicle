import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	hasPendingProcessing,
	processPendingHealthReports,
} from '@/features/health/services/health-processing.service'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'

export function uploadedHealthReportsQueryKey(userId: string | undefined) {
	return ['health-reports', userId] as const
}

export function useUploadedHealthReports(userId: string | undefined) {
	const query = useQuery({
		queryKey: uploadedHealthReportsQueryKey(userId),
		queryFn: fetchUploadedHealthReports,
		enabled: Boolean(userId),
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
