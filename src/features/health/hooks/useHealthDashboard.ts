import { useMemo } from 'react'
import {
	getHealthDashboard,
	getHealthReports,
	getUpcomingActions,
} from '@/features/health/services/health.service'
import { getLatestExtractedReport } from '@/features/health/services/health-derived-dashboard.service'
import type {
	HealthReport,
	UploadedHealthReport,
} from '@/features/health/types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { formatReportTypeLabel } from '@/features/health/services/health-parsed-report.service'
import { useAuth } from '@/features/auth'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'

export function useHealthDashboard(
	uploadedReports: UploadedHealthReport[] = [],
) {
	const { user } = useAuth()
	const knowledge = useHealthKnowledge(user?.id, uploadedReports)

	return useMemo(() => {
		const completedReports = uploadedReports.filter(
			(report) => report.status === 'completed',
		)
		const latestExtracted = getLatestExtractedReport(uploadedReports)
		const latestParsed = latestExtracted
			? getParsedHealthReport(latestExtracted)
			: null

		const latestReport: HealthReport | undefined = latestParsed
			? {
					id: latestExtracted!.id,
					date:
						latestParsed.metadata.reportDate ??
						latestExtracted!.uploaded_at.slice(0, 10),
					displayDate: latestParsed.metadata.reportDate
						? formatReportTypeLabel(latestParsed.metadata.reportType)
						: 'Latest Report',
					lab: latestParsed.metadata.laboratory,
					category: latestParsed.metadata
						.reportType as import('@/features/health/types').HealthCategoryId,
					title: latestExtracted!.file_name,
					summary: `${latestParsed.metrics.length} metrics extracted from uploaded report.`,
					metrics: [],
					doctorNotes: '',
					recommendations: [],
				}
			: undefined

		return {
			dashboard: getHealthDashboard(),
			latestReport,
			snapshots: knowledge.snapshots,
			insights: knowledge.insights,
			actions: getUpcomingActions(),
			reports: getHealthReports(),
			hasImportedReports: completedReports.length > 0,
			knowledgeGraph: knowledge.graph,
		}
	}, [uploadedReports, knowledge])
}
