import { C, pagePadding } from '@/constants/colors'
import { CategoryGrid } from '@/features/health/components/CategoryGrid'
import { HealthPageHeader } from '@/features/health/components/HealthPageHeader'
import { HealthScoreCard } from '@/features/health/components/HealthScoreCard'
import { LastCheckupCard } from '@/features/health/components/LastCheckupCard'
import { LatestReportCard } from '@/features/health/components/LatestReportCard'
import { ReportTimeline } from '@/features/health/components/ReportTimeline'
import { useHealthDashboard } from '@/features/health/hooks/useHealthDashboard'

export function HealthHomePage() {
	const { dashboard, latestReport, categories, reports } = useHealthDashboard()

	return (
		<div style={{ padding: pagePadding.more, color: C.text }}>
			<HealthPageHeader
				title="Health"
				subtitle="Your reports and checkups in one place"
			/>

			<HealthScoreCard score={dashboard.score} />

			{latestReport ? <LatestReportCard report={latestReport} /> : null}

			<LastCheckupCard label={dashboard.lastCheckupLabel} />

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Health Categories
			</div>
			<CategoryGrid categories={categories} />

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Reports
			</div>
			<ReportTimeline reports={reports} />
		</div>
	)
}
