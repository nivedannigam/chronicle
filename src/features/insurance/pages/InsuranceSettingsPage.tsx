import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { InsuranceModuleFolderPicker } from '@/features/insurance/components/InsuranceModuleFolderPicker'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import { useInsurancePreferences } from '@/features/insurance/hooks/useInsurancePreferences'
import { useInsuranceSources } from '@/features/insurance/hooks/useInsuranceSources'
import {
	clearInsurancePreferences,
	recordInsuranceLastScan,
} from '@/features/insurance/services/insurance-preferences.service'
import { DEFAULT_INSURANCE_PREFERENCES } from '@/features/insurance/types/insurance-preferences.types'
import {
	buildDriveFolderUrl,
	clearModuleFolderAssignments,
	formatLastScannedLabel,
} from '@/features/settings/services/module-folder-assignments.service'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { FigmaInsuranceSettingsView } from '@/ui/figma/insurance/FigmaInsuranceSettingsView'

export function InsuranceSettingsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember, selectedMemberId } = useFamilyContext()
	const { knowledge, refetch: refetchKnowledge } = useInsuranceContext()
	const {
		assignments,
		isLoading: sourcesLoading,
		refresh,
	} = useInsuranceSources(userId)
	const { preferences, updatePreferences, recordScan } =
		useInsurancePreferences(userId)
	const driveConnector = useGoogleDriveConnector(userId)
	const [folderPickerOpen, setFolderPickerOpen] = useState(false)
	const [isDisconnecting, setIsDisconnecting] = useState(false)

	const memberAssignment = useMemo(() => {
		if (!selectedMemberId) {
			return null
		}

		return (
			assignments.find(
				(assignment) => assignment.familyMemberId === selectedMemberId,
			) ??
			assignments[0] ??
			null
		)
	}, [assignments, selectedMemberId])

	if (!userId) {
		return (
			<DashboardEmptyState
				title="Sign in to manage insurance settings"
				message="Connect Google Drive and assign folders once you are signed in."
				emoji="🔐"
			/>
		)
	}

	if (!selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are managing insurance settings for."
				emoji="👨‍👩‍👧"
				actionLabel="Go to Family"
				onAction={() => navigate(ROUTES.profileFamily)}
			/>
		)
	}

	const memberLabel = formatMemberLabel(selectedMember)
	const driveConnected = driveConnector.connectionStatus === 'connected'
	const resolvedPreferences = preferences ?? DEFAULT_INSURANCE_PREFERENCES
	const lastScannedLabel =
		formatLastScannedLabel(resolvedPreferences.lastScannedAt) ??
		formatLastScannedLabel(
			driveConnector.latestSync?.completedAt ??
				driveConnector.latestSync?.startedAt,
		)

	const handleDisconnect = async () => {
		setIsDisconnecting(true)

		try {
			await driveConnector.disconnect()
			await refresh()
		} finally {
			setIsDisconnecting(false)
		}
	}

	const handleForceRescan = async () => {
		recordScan()
		await driveConnector.sync()
		await refresh()
		await refetchKnowledge()
	}

	const handleRebuildKnowledge = async () => {
		recordInsuranceLastScan(userId)
		await refetchKnowledge()
	}

	const handleResetModule = async () => {
		await clearModuleFolderAssignments(userId, 'insurance')
		clearInsurancePreferences(userId)
		await refresh()
		await refetchKnowledge()
	}

	return (
		<>
			<FigmaInsuranceSettingsView
				driveConnected={driveConnected}
				driveLabel={driveConnector.googleEmail ?? 'Google Drive'}
				folderName={memberAssignment?.folderName ?? null}
				folderPath={memberAssignment?.folderPath ?? null}
				documentCount={knowledge.documents.length}
				lastScannedLabel={lastScannedLabel}
				isLoadingFolder={sourcesLoading}
				preferences={resolvedPreferences}
				memberLabel={memberLabel}
				onConnectDrive={() => navigate(ROUTES.profileConnectionsDrive)}
				onChooseFolder={() => setFolderPickerOpen(true)}
				onChangeFolder={() => setFolderPickerOpen(true)}
				onOpenFolder={() => {
					if (memberAssignment?.externalFolderId) {
						window.open(
							buildDriveFolderUrl(memberAssignment.externalFolderId),
							'_blank',
							'noopener,noreferrer',
						)
					}
				}}
				onUpdatePreferences={(patch) => {
					void updatePreferences(patch)
				}}
				onPrivacy={() => navigate(ROUTES.profileSecurity)}
				onExport={() => navigate(ROUTES.profileSecurity)}
				onPermissions={() => navigate(ROUTES.profileConnections)}
				onDisconnect={() => void handleDisconnect()}
				isDisconnecting={isDisconnecting}
				onForceRescan={() => void handleForceRescan()}
				onRebuildKnowledge={() => void handleRebuildKnowledge()}
				onViewDiagnostics={() => navigate(ROUTES.insurancePolicies)}
				onViewFailedDocuments={() => navigate(ROUTES.insurancePolicies)}
				onDownloadRawData={() => {
					const blob = new Blob([JSON.stringify(knowledge, null, 2)], {
						type: 'application/json',
					})
					const url = URL.createObjectURL(blob)
					const anchor = document.createElement('a')
					anchor.href = url
					anchor.download = 'chronicle-insurance-data.json'
					anchor.click()
					URL.revokeObjectURL(url)
				}}
				onResetModule={() => void handleResetModule()}
				onDeleteInsuranceData={() => void handleResetModule()}
			/>

			<InsuranceModuleFolderPicker
				userId={userId}
				open={folderPickerOpen}
				onClose={() => setFolderPickerOpen(false)}
				onAssigned={() => {
					recordScan()
					void refresh()
					void refetchKnowledge()
				}}
			/>
		</>
	)
}
