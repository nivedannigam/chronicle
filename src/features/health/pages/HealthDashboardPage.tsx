import { useNavigate } from 'react-router-dom'
import { healthReportPath } from '@/constants/routes'
import { HealthHero } from '@/features/health/components/HealthHero'
import { HealthInsightsList } from '@/features/health/components/HealthInsightsList'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { HealthSnapshotGrid } from '@/features/health/components/HealthSnapshotGrid'
import { HealthUploadTimeline } from '@/features/health/components/HealthUploadTimeline'
import { UpcomingActionsList } from '@/features/health/components/UpcomingActionsList'
import { useHealthDashboard } from '@/features/health/hooks/useHealthDashboard'

export function HealthDashboardPage() {
	const navigate = useNavigate()
	const {
		dashboard,
		latestReport,
		snapshots,
		insights,
		actions,
		uploadTimeline,
	} = useHealthDashboard()

	return (
		<>
			<HealthHero
				dashboard={dashboard}
				latestReport={latestReport}
				onLatestReportClick={() => {
					if (latestReport) {
						navigate(healthReportPath(latestReport.id))
					}
				}}
			/>

			<HealthSectionHeader title="Health Snapshot" />
			<HealthSnapshotGrid snapshots={snapshots} />

			<HealthSectionHeader title="Health Timeline" />
			<div style={{ marginBottom: 26 }}>
				<HealthUploadTimeline items={uploadTimeline} />
			</div>

			<HealthSectionHeader title="Latest Insights" />
			<HealthInsightsList insights={insights} />

			<HealthSectionHeader title="Upcoming Actions" />
			<UpcomingActionsList actions={actions} />
		</>
	)
}
