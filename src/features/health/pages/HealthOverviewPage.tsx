import { useNavigate } from 'react-router-dom'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { ImportNotifications } from '@/features/health-import/components/ImportNotifications'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { ROUTES } from '@/constants/routes'
import { FigmaHealthOverviewView } from '@/ui/figma/health/figma-health-views'

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
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</>
		)
	}

	return (
		<>
			<ImportNotifications />
			<FigmaHealthOverviewView
				companion={companion}
				memberName={selectedMember?.displayName ?? null}
			/>
		</>
	)
}

/** @deprecated Use HealthOverviewPage */
export const HealthDashboardPage = HealthOverviewPage
