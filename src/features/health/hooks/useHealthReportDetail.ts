import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { toUiMetrics } from '@/features/health/extraction'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import {
	fetchHealthMetricsForReport,
	storedMetricsToUiMetrics,
} from '@/features/health/services/health-metrics.service'
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

	const uploaded = uploadedQuery.data?.find((report) => report.id === reportId)

	const metricsQuery = useQuery({
		queryKey: queryKeys.health.reportDetail(reportId),
		queryFn: () => fetchHealthMetricsForReport(reportId!),
		enabled: Boolean(
			reportId &&
			uploaded &&
			(uploaded.status === 'completed' || uploaded.status === 'parsed'),
		),
		staleTime: STALE_TIME.reports,
	})

	return useMemo(() => {
		if (!reportId) {
			return { source: null, isLoading: false }
		}

		if (uploaded) {
			const parsed = getParsedHealthReport(uploaded)
			const storedMetrics = metricsQuery.data ?? []
			const uiMetrics =
				storedMetrics.length > 0
					? storedMetricsToUiMetrics(storedMetrics)
					: parsed
						? toUiMetrics(parsed.metrics)
						: []

			return {
				source: { type: 'uploaded', report: uploaded } as ReportDetailSource,
				parsed,
				uiMetrics,
				isLoading: uploadedQuery.isLoading || metricsQuery.isLoading,
				isFetching: uploadedQuery.isFetching || metricsQuery.isFetching,
				isError: uploadedQuery.isError || metricsQuery.isError,
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
		uploaded,
		uploadedQuery.isLoading,
		uploadedQuery.isFetching,
		uploadedQuery.isError,
		metricsQuery.data,
		metricsQuery.isLoading,
		metricsQuery.isFetching,
		metricsQuery.isError,
	])
}
