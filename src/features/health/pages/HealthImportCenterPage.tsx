import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useImportCenterView } from '@/features/health-import/hooks/useImportCenterView'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { FigmaImportCenterView } from '@/ui/figma/health/FigmaImportCenterView'
import { ROUTES } from '@/constants/routes'
import { useNavigate } from 'react-router-dom'

export function HealthImportCenterPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember } = useFamilyContext()
	const center = useImportCenterView(userId)

	if (!userId) {
		return (
			<DashboardEmptyState
				title="Sign in to view import activity"
				message="Connect Google Drive and Chronicle will organize your records quietly in the background."
				emoji="🔐"
			/>
		)
	}

	if (!selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are managing health records for."
				emoji="👨‍👩‍👧"
				actionLabel="Go to Family"
				onAction={() => navigate(ROUTES.profileFamily)}
			/>
		)
	}

	if (center.isLoading) {
		return <ListSkeleton rows={4} />
	}

	if (!center.view.hasAnything) {
		return (
			<DashboardEmptyState
				title="All caught up"
				message="Chronicle is organizing your health records in the background. You'll only hear from us when something needs you."
				emoji="✨"
			/>
		)
	}

	return (
		<FigmaImportCenterView
			view={center.view}
			busyItemId={center.busyItemId}
			onKeep={(registryId) => void center.handleKeep(registryId)}
			onIgnore={(registryId) => void center.handleIgnore(registryId)}
			onChooseMember={(registryId, memberId) =>
				void center.handleChooseMember(registryId, memberId)
			}
			onTryAgain={(input) => void center.handleTryAgain(input)}
			onMove={center.handleMove}
		/>
	)
}
