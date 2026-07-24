import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { healthMetricPath, healthReportPath, ROUTES } from '@/constants/routes'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import {
	DashboardMetricSection,
	DashboardSectionHeader,
} from '@/features/health/components/dashboard/DashboardMetricSection'
import { HealthSummaryBar } from '@/features/health/components/dashboard/HealthSummaryBar'
import { DASHBOARD_SECTIONS } from '@/features/health/config/dashboard-sections.config'
import { HealthHero } from '@/features/health/components/HealthHero'
import { HealthInsightsList } from '@/features/health/components/HealthInsightsList'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { ReportTimeline } from '@/features/health/components/ReportTimeline'
import { useDashboardSectionHistories } from '@/features/health/hooks/useDashboardSectionHistories'
import { useHealthDashboard } from '@/features/health/hooks/useHealthDashboard'
import { useHealthDashboardSummary } from '@/features/health/hooks/useHealthDashboardSummary'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { buildHealthTimeline } from '@/features/health/services/health-timeline.service'
import { ImportNotifications } from '@/features/health-import/components/ImportNotifications'
import {
	LegacyOcrDataBanner,
	OcrConfigurationBanner,
	countLegacyApproximateOcrReports,
} from '@/features/health/components/OcrStatusBanner'
import { C } from '@/constants/colors'

const TIMELINE_PREVIEW_COUNT = 3

export function HealthDashboardPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const uploadedQuery = useUploadedHealthReports(user?.id)
	const uploadedReports = uploadedQuery.data ?? []
	const [showAllCategories, setShowAllCategories] = useState(false)

	const {
		dashboard,
		latestReport,
		insights,
		knowledgeGraph,
		hasImportedReports,
	} = useHealthDashboard(uploadedReports)

	const summaryStats = useHealthDashboardSummary(
		user?.id,
		uploadedReports,
		knowledgeGraph,
	)
	const sectionData = useDashboardSectionHistories(
		knowledgeGraph.profile.metricHistories,
	)

	const timelineItems = useMemo(
		() => (hasImportedReports ? buildHealthTimeline([], uploadedReports) : []),
		[hasImportedReports, uploadedReports],
	)

	const visibleSections = useMemo(() => {
		return DASHBOARD_SECTIONS.map((sectionConfig, index) => ({
			sectionConfig,
			entry: sectionData[index]!,
		})).filter(({ entry }) => showAllCategories || entry.histories.length > 0)
	}, [sectionData, showAllCategories])

	const hiddenSectionCount = DASHBOARD_SECTIONS.length - visibleSections.length
	const timelinePreview = timelineItems.slice(0, TIMELINE_PREVIEW_COUNT)
	const completedReports = uploadedReports.filter(
		(report) => report.status === 'completed',
	)
	const legacyOcrCount = countLegacyApproximateOcrReports(completedReports)
	const failedOcrCount = uploadedReports.filter(
		(report) => report.status === 'failed',
	).length
	const showLegacyBanner =
		completedReports.length > 0 &&
		legacyOcrCount / completedReports.length > 0.5
	const showOcrConfigBanner = failedOcrCount > 0 && legacyOcrCount === 0

	return (
		<>
			<ImportNotifications />

			{showLegacyBanner ? <LegacyOcrDataBanner /> : null}
			{showOcrConfigBanner ? <OcrConfigurationBanner /> : null}

			<HealthSummaryBar stats={summaryStats} />

			{hasImportedReports ? (
				<HealthHero
					dashboard={{
						...dashboard,
						score: summaryStats.healthScore ?? 0,
						lastUpdated: summaryStats.latestReportDate ?? dashboard.lastUpdated,
					}}
					latestReport={latestReport}
					onLatestReportClick={() => {
						if (latestReport) {
							navigate(healthReportPath(latestReport.id))
						}
					}}
				/>
			) : null}

			{uploadedQuery.isLoading ? (
				<DashboardSkeleton />
			) : !hasImportedReports ? (
				<DashboardEmptyState
					title="No reports imported"
					message="Connect Google Drive, assign a health folder, and scan for medical reports. Open the profile menu → Health folder sources to get started."
					emoji="🏥"
					actionLabel="Go to Health Sources"
					onAction={() => navigate(ROUTES.healthSources)}
				/>
			) : (
				<>
					{visibleSections.map(({ sectionConfig, entry }) => (
						<div key={sectionConfig.id} style={{ marginBottom: 26 }}>
							<DashboardSectionHeader
								title={sectionConfig.title}
								emoji={sectionConfig.emoji}
								count={entry.histories.length}
							/>
							<DashboardMetricSection
								section={sectionConfig}
								histories={entry.histories}
								onViewTimeline={(metricId) =>
									navigate(healthMetricPath(metricId))
								}
							/>
						</div>
					))}

					{hiddenSectionCount > 0 || showAllCategories ? (
						<button
							type="button"
							onClick={() => setShowAllCategories((value) => !value)}
							style={{
								width: '100%',
								background: C.card2,
								border: `1px solid ${C.border}`,
								borderRadius: 12,
								padding: '10px 14px',
								fontSize: 13,
								fontWeight: 600,
								color: C.textSec,
								cursor: 'pointer',
								fontFamily: 'inherit',
								marginBottom: 20,
							}}
						>
							{showAllCategories
								? 'Show non-empty categories only'
								: `Show all categories (${DASHBOARD_SECTIONS.length})`}
						</button>
					) : null}

					<HealthSectionHeader title="Health Timeline" />
					<div style={{ marginBottom: 26 }}>
						{timelinePreview.length === 0 ? (
							<DashboardEmptyState
								title="No timeline yet"
								message="Imported reports will appear here chronologically."
								emoji="📅"
							/>
						) : (
							<>
								<ReportTimeline
									items={timelinePreview}
									isLoading={false}
									errorMessage={null}
								/>
								{timelineItems.length > TIMELINE_PREVIEW_COUNT ? (
									<button
										type="button"
										onClick={() => navigate(ROUTES.healthReports)}
										style={{
											marginTop: 10,
											background: 'none',
											border: 'none',
											padding: 0,
											fontSize: 13,
											fontWeight: 700,
											color: C.accent,
											cursor: 'pointer',
											fontFamily: 'inherit',
										}}
									>
										See all reports →
									</button>
								) : null}
							</>
						)}
					</div>

					{insights.length > 0 ? (
						<>
							<HealthSectionHeader title="Latest Insights" />
							<HealthInsightsList insights={insights} />
						</>
					) : null}
				</>
			)}
		</>
	)
}
