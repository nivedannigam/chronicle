import { useMemo } from 'react'
import { useAuth } from '@/features/auth'
import { useHealthMetrics } from '@/features/health/hooks/useHealthMetrics'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import { buildHealthVisitSnapshots } from '@/features/health-knowledge/services/health-snapshot.service'
import { buildHealthVisits } from '@/features/health/services/health-visit.mapper'

export function useReportHealthImpact(reportId: string | undefined) {
	const { user } = useAuth()
	const userId = user?.id
	const reportsQuery = useMemberHealthReports()
	const metricsQuery = useHealthMetrics()
	const reports = reportsQuery.data
	const storedMetrics = metricsQuery.data

	return useMemo(() => {
		if (!reportId || !userId) {
			return { snapshot: undefined, relatedVisitId: null as string | null }
		}

		const reportList = reports ?? []
		const metricList = storedMetrics ?? []

		const graph = healthKnowledgeService.getGraphForUser(
			userId,
			reportList,
			metricList,
		)
		const snapshots = buildHealthVisitSnapshots({ graph, reports: reportList })
		const snapshot = snapshots.find((entry) => entry.reportId === reportId)
		const relatedVisitId =
			buildHealthVisits(reportList).find((visit) =>
				visit.reportIds.includes(reportId),
			)?.id ?? null

		return { snapshot, relatedVisitId }
	}, [reportId, reports, storedMetrics, userId])
}
