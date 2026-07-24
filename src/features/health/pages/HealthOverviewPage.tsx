import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { C } from '@/constants/colors'
import { healthMetricPath, healthReportPath, ROUTES } from '@/constants/routes'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSummaryBar } from '@/features/health/components/dashboard/HealthSummaryBar'
import { HealthHero } from '@/features/health/components/HealthHero'
import { HealthInsightsList } from '@/features/health/components/HealthInsightsList'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { HealthSnapshotGrid } from '@/features/health/components/HealthSnapshotGrid'
import { ReportTimeline } from '@/features/health/components/ReportTimeline'
import { TrendChartGrid } from '@/features/health/components/TrendChart'
import { useHealthDashboard } from '@/features/health/hooks/useHealthDashboard'
import { useHealthDashboardSummary } from '@/features/health/hooks/useHealthDashboardSummary'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { buildHealthTimeline } from '@/features/health/services/health-timeline.service'
import { ImportNotifications } from '@/features/health-import/components/ImportNotifications'

const TIMELINE_PREVIEW = 3
const TREND_PREVIEW = 4

export function HealthOverviewPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { selectedMember } = useFamilyContext()
	const setup = useHealthMemberSetup()
	const uploadedQuery = useMemberHealthReports()
	const uploadedReports = uploadedQuery.data ?? []

	const {
		dashboard,
		latestReport,
		insights,
		knowledgeGraph,
		hasImportedReports,
		snapshots,
		trendSeries,
	} = useHealthDashboard(uploadedReports)

	const summaryStats = useHealthDashboardSummary(
		user?.id,
		uploadedReports,
		knowledgeGraph,
	)

	const timelineItems = useMemo(
		() => buildHealthTimeline(uploadedReports),
		[uploadedReports],
	)

	const latestReports = useMemo(
		() =>
			[...uploadedReports]
				.filter((report) => report.status === 'completed')
				.slice(0, 3),
		[uploadedReports],
	)

	const trendPreview = trendSeries.slice(0, TREND_PREVIEW)
	const aiSummary = insights[0]?.text ?? null

	if (uploadedQuery.isLoading || setup.isLoading) {
		return <DashboardSkeleton />
	}

	if (!hasImportedReports) {
		return (
			<>
				<ImportNotifications />
				<HealthSetupGuide />
				<DashboardEmptyState
					title="No health data yet"
					message={`When reports are imported for ${selectedMember?.displayName ?? 'this member'}, your health score, vitals, and insights will appear here.`}
					emoji="🏥"
				/>
			</>
		)
	}

	return (
		<>
			<ImportNotifications />

			{setup.needsReview > 0 ? (
				<div
					style={{
						background: `${C.orange}14`,
						border: `1px solid ${C.orange}44`,
						borderRadius: 14,
						padding: '12px 14px',
						marginBottom: 16,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<div style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>
						<strong>{setup.needsReview}</strong> report
						{setup.needsReview === 1 ? '' : 's'} waiting for your review.
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthImportReview)}
						style={{
							background: C.orange,
							color: C.white,
							border: 'none',
							borderRadius: 100,
							padding: '8px 12px',
							fontSize: 12,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
							flexShrink: 0,
						}}
					>
						Review
					</button>
				</div>
			) : null}

			<HealthSummaryBar stats={summaryStats} />

			<HealthHero
				dashboard={{
					...dashboard,
					score: summaryStats.healthScore ?? dashboard.score,
					lastUpdated: summaryStats.latestReportDate ?? dashboard.lastUpdated,
				}}
				latestReport={latestReport}
				onLatestReportClick={() => {
					if (latestReport) {
						navigate(healthReportPath(latestReport.id))
					}
				}}
			/>

			{setup.importStatus?.lastScanAt ? (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 14,
						padding: '14px 16px',
						marginBottom: 20,
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: C.textMuted,
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							marginBottom: 4,
						}}
					>
						Latest import
					</div>
					<div style={{ fontSize: 14, fontWeight: 600 }}>
						{summaryStats.reportsImported} report
						{summaryStats.reportsImported === 1 ? '' : 's'} imported
					</div>
					<div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
						Last scan{' '}
						{new Date(setup.importStatus.lastScanAt).toLocaleDateString(
							'en-US',
							{
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							},
						)}
					</div>
				</div>
			) : null}

			{snapshots.length > 0 ? (
				<>
					<HealthSectionHeader title="Vitals Summary" />
					<div style={{ marginBottom: 24 }}>
						<HealthSnapshotGrid snapshots={snapshots.slice(0, 6)} />
					</div>
				</>
			) : null}

			{trendPreview.length > 0 ? (
				<>
					<HealthSectionHeader title="Recent Trends" />
					<div style={{ marginBottom: 12 }}>
						<TrendChartGrid
							series={trendPreview}
							onSeriesClick={(metricId) => navigate(healthMetricPath(metricId))}
						/>
					</div>
					{trendSeries.length > TREND_PREVIEW ? (
						<button
							type="button"
							onClick={() => navigate(ROUTES.healthMetrics)}
							style={{
								background: 'none',
								border: 'none',
								padding: 0,
								marginBottom: 24,
								fontSize: 13,
								fontWeight: 700,
								color: C.accent,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							View all metrics →
						</button>
					) : null}
				</>
			) : null}

			<HealthSectionHeader title="Upcoming Tests" />
			<DashboardEmptyState
				title="No upcoming tests"
				message="Appointments and scheduled tests will appear here in a future update."
				emoji="📅"
			/>

			{aiSummary ? (
				<>
					<HealthSectionHeader title="Health Summary" />
					<div
						style={{
							background: C.card,
							border: `1px solid rgba(108,111,255,0.25)`,
							borderRadius: 16,
							padding: '16px',
							marginBottom: 24,
							display: 'flex',
							gap: 12,
							alignItems: 'flex-start',
						}}
					>
						<Sparkles
							size={18}
							color={C.accent}
							style={{ flexShrink: 0, marginTop: 2 }}
						/>
						<p
							style={{
								margin: 0,
								fontSize: 14,
								color: C.textSec,
								lineHeight: 1.55,
							}}
						>
							{aiSummary}
						</p>
					</div>
				</>
			) : null}

			<HealthSectionHeader title="Quick Actions" />
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 10,
					marginBottom: 24,
				}}
			>
				{[
					{ label: 'View reports', path: ROUTES.healthReports },
					{ label: 'Health settings', path: ROUTES.healthSettings },
					{ label: 'Ask Chronicle', path: ROUTES.ask },
					{ label: 'Scan for new reports', path: ROUTES.healthSettings },
				].map(({ label, path }) => (
					<button
						key={label}
						type="button"
						onClick={() => navigate(path)}
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 14,
							padding: '14px 12px',
							fontSize: 13,
							fontWeight: 600,
							color: C.text,
							cursor: 'pointer',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						{label}
					</button>
				))}
			</div>

			{latestReports.length > 0 ? (
				<>
					<HealthSectionHeader title="Latest Reports" />
					<div style={{ marginBottom: 16 }}>
						<ReportTimeline
							items={timelineItems.slice(0, TIMELINE_PREVIEW)}
							isLoading={false}
							errorMessage={null}
						/>
					</div>
				</>
			) : null}

			{insights.length > 0 ? (
				<>
					<HealthSectionHeader title="Latest Insights" />
					<HealthInsightsList insights={insights.slice(0, 3)} />
					{insights.length > 3 ? (
						<button
							type="button"
							onClick={() => navigate(ROUTES.healthInsights)}
							style={{
								background: 'none',
								border: 'none',
								padding: 0,
								marginBottom: 24,
								fontSize: 13,
								fontWeight: 700,
								color: C.accent,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							View all insights →
						</button>
					) : null}
				</>
			) : null}
		</>
	)
}

/** @deprecated Use HealthOverviewPage */
export const HealthDashboardPage = HealthOverviewPage
