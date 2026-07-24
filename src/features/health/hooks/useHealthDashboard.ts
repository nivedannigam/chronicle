import { useMemo } from 'react'
import { getLatestExtractedReport } from '@/features/health/services/health-derived-dashboard.service'
import type {
	HealthDashboard,
	HealthReport,
	UploadedHealthReport,
} from '@/features/health/types'
import {
	getParsedHealthReport,
	formatReportTypeLabel,
} from '@/features/health/services/health-parsed-report.service'
import { useAuth } from '@/features/auth'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'

function computeHealthScore(graph: HealthKnowledgeGraph): number | null {
	const histories = graph.profile.metricHistories

	if (histories.length === 0) {
		return null
	}

	let normalCount = 0
	let totalWithStatus = 0

	for (const history of histories) {
		const latestObs = history.observations[history.observations.length - 1]

		if (latestObs?.status) {
			totalWithStatus += 1

			if (latestObs.status === 'normal') {
				normalCount += 1
			}
		}
	}

	if (totalWithStatus === 0) {
		return null
	}

	return Math.round((normalCount / totalWithStatus) * 100)
}

function deriveOverallStatus(score: number | null): string {
	if (score === null) {
		return 'Awaiting data'
	}

	if (score >= 85) {
		return 'Looking good'
	}

	if (score >= 70) {
		return 'Mostly on track'
	}

	return 'Needs attention'
}

function buildDashboardFromData(
	uploadedReports: UploadedHealthReport[],
	graph: HealthKnowledgeGraph,
): HealthDashboard {
	const latestExtracted = getLatestExtractedReport(uploadedReports)
	const latestParsed = latestExtracted
		? getParsedHealthReport(latestExtracted)
		: null
	const score = computeHealthScore(graph)
	const latestDate = latestParsed?.metadata.reportDate
		? new Date(latestParsed.metadata.reportDate).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		: latestExtracted
			? new Date(latestExtracted.uploaded_at).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				})
			: '—'

	return {
		score: score ?? 0,
		latestReportId: latestExtracted?.id ?? '',
		lastCheckupDate: latestParsed?.metadata.reportDate ?? '',
		lastCheckupLabel: latestParsed
			? formatReportTypeLabel(latestParsed.metadata.reportType)
			: 'No reports yet',
		overallStatus: deriveOverallStatus(score),
		lastUpdated: latestDate,
	}
}

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
			dashboard: buildDashboardFromData(uploadedReports, knowledge.graph),
			latestReport,
			snapshots: knowledge.snapshots,
			insights: knowledge.insights,
			actions: [],
			hasImportedReports: completedReports.length > 0,
			knowledgeGraph: knowledge.graph,
			trendSeries: knowledge.trendSeries,
		}
	}, [uploadedReports, knowledge])
}
