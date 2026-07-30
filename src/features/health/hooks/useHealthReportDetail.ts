import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { toUiMetrics } from '@/features/health/extraction'
import type { UploadedHealthReport } from '@/features/health/types'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export type ReportDetailSource = {
	type: 'uploaded'
	report: UploadedHealthReport
}

export function useHealthReportDetail(reportId: string | undefined) {
	const { user } = useAuth()
	const userId = user?.id

	const uploadedQuery = useQuery({
		queryKey: queryKeys.health.reports(userId),
		queryFn: fetchUploadedHealthReports,
		enabled: Boolean(userId && reportId),
		staleTime: STALE_TIME.reports,
	})

	return useMemo(() => {
		if (!reportId) {
			return { source: null, isLoading: false }
		}

		const uploaded = uploadedQuery.data?.find(
			(report) => report.id === reportId,
		)

		if (uploaded) {
			const parsed = getParsedHealthReport(uploaded)

			return {
				source: { type: 'uploaded', report: uploaded } as ReportDetailSource,
				parsed,
				uiMetrics: parsed ? toUiMetrics(parsed.metrics) : [],
				isLoading: uploadedQuery.isLoading,
				isFetching: uploadedQuery.isFetching,
				isError: uploadedQuery.isError,
			}
		}

		return {
			source: null,
			isLoading: uploadedQuery.isLoading,
			isFetching: uploadedQuery.isFetching,
			isError: uploadedQuery.isError,
		}
	}, [
		reportId,
		uploadedQuery.data,
		uploadedQuery.isLoading,
		uploadedQuery.isFetching,
		uploadedQuery.isError,
	])
}
