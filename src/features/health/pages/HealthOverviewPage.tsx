import { useNavigate } from 'react-router-dom'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { ImportNotifications } from '@/features/health-import/components/ImportNotifications'
import { HealthAttentionList } from '@/features/health/components/companion/HealthAttentionList'
import { HealthChangesList } from '@/features/health/components/companion/HealthChangesList'
import { HealthNextStepsList } from '@/features/health/components/companion/HealthNextStepsList'
import { HealthRecentReportsList } from '@/features/health/components/companion/HealthReportRecordCard'
import { HealthStatusHero } from '@/features/health/components/companion/HealthStatusHero'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { ROUTES } from '@/constants/routes'

export function HealthOverviewPage() {
	const navigate = useNavigate()
	const { selectedMember } = useFamilyContext()
	const { companion, hasImportedReports, isLoading, isError, refetch } =
		useHealthCompanion()

	if (isLoading) {
		return <DashboardSkeleton />
	}

	if (isError) {
		return (
			<DashboardEmptyState
				title="Could not load health data"
				message="Check your connection and try again."
				emoji="⚠️"
				actionLabel="Try again"
				onAction={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports) {
		return (
			<>
				<ImportNotifications />
				<HealthSetupGuide />
				<DashboardEmptyState
					title="Your health story starts here"
					message={`When reports are added for ${selectedMember?.displayName ?? 'this member'}, Chronicle will show how they are doing, what changed, and what needs attention.`}
					emoji="💚"
				/>
			</>
		)
	}

	return (
		<>
			<ImportNotifications />

			<HealthStatusHero
				status={companion.status}
				detail={companion.statusDetail}
				score={companion.score}
				memberName={selectedMember?.displayName ?? null}
			/>

			<HealthAttentionList items={companion.attention} />
			<HealthChangesList items={companion.changes} />
			<HealthNextStepsList items={companion.nextSteps} />
			<HealthRecentReportsList
				reports={companion.recentReports}
				limit={3}
				onViewAll={() => navigate(ROUTES.healthReports)}
			/>
		</>
	)
}

/** @deprecated Use HealthOverviewPage */
export const HealthDashboardPage = HealthOverviewPage
