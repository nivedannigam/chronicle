import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { HomeRecentActivity } from '@/features/home/components/HomeRecentActivity'
import { buildAllHomeActivities } from '@/features/home/services/home-briefing.service'

export function HomeActivityPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const reportsQuery = useMemberHealthReports()
	const importStatus = useHealthImportStatus(user?.id)
	const activities = buildAllHomeActivities(
		reportsQuery.data ?? [],
		importStatus.data,
	)

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(-1)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 18,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div
				style={{
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 20,
				}}
			>
				Activity
			</div>

			<HomeRecentActivity
				activities={activities}
				totalCount={activities.length}
				isLoading={reportsQuery.isLoading || importStatus.isLoading}
				title="All Activity"
				showViewAll={false}
			/>
		</div>
	)
}
