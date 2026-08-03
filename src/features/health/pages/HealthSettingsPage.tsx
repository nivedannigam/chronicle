import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { FigmaHealthSettingsView } from '@/ui/figma/health/FigmaHealthSettingsView'

export function HealthSettingsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember, selectedMemberId } = useFamilyContext()
	const setup = useHealthMemberSetup()
	const { assignments, isLoading, refresh } = useHealthSources(userId)
	const driveConnector = useGoogleDriveConnector(userId)
	const [isDisconnecting, setIsDisconnecting] = useState(false)

	const memberAssignments = useMemo(() => {
		if (!selectedMemberId) {
			return []
		}

		return assignments
			.filter((assignment) => assignment.familyMemberId === selectedMemberId)
			.map((assignment) => ({
				id: assignment.id,
				folderName: assignment.folderName,
			}))
	}, [assignments, selectedMemberId])

	if (!userId) {
		return (
			<DashboardEmptyState
				title="Sign in to manage health settings"
				message="Connect Google Drive and assign folders once you are signed in."
				emoji="🔐"
			/>
		)
	}

	if (!selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are managing health settings for."
				emoji="👨‍👩‍👧"
				actionLabel="Go to Family"
				onAction={() => navigate(ROUTES.profileFamily)}
			/>
		)
	}

	const memberLabel = formatMemberLabel(selectedMember)

	const handleDisconnect = async () => {
		setIsDisconnecting(true)

		try {
			await driveConnector.disconnect()
			await refresh()
			await setup.refetch()
		} finally {
			setIsDisconnecting(false)
		}
	}

	return (
		<FigmaHealthSettingsView
			driveConnected={setup.driveConnected}
			memberLabel={memberLabel}
			assignments={memberAssignments}
			isLoadingAssignments={isLoading}
			onConnectDrive={() => navigate(ROUTES.profileConnectionsDrive)}
			onChooseFolder={() => navigate(ROUTES.healthFolderSetup)}
			onChangeFolder={() => navigate(ROUTES.healthFolderSetup)}
			onPrivacy={() => navigate(ROUTES.settingsData)}
			onExport={() => navigate(ROUTES.settingsData)}
			onDisconnect={() => void handleDisconnect()}
			isDisconnecting={isDisconnecting}
		/>
	)
}
