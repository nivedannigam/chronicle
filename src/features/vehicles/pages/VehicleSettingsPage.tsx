import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { VehicleModuleFolderPicker } from '@/features/vehicles/components/VehicleModuleFolderPicker'
import { useVehicleContext } from '@/features/vehicles/context/VehicleContext'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'
import {
	buildModuleProviderQuery,
	resolveModuleLibraryDocumentCount,
} from '@/core/platform/services/federated-library.service'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { runVehicleImportSync } from '@/features/vehicle-import/services/vehicle-import-runner.service'
import { formatLastScannedLabel } from '@/features/settings/services/module-folder-assignments.service'
import {
	ModuleSettingsAdvancedSection,
	ModuleSettingsConnectedFolderCard,
	ModuleSettingsSection,
} from '@/ui/figma/settings/module-settings-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function VehicleSettingsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember, selectedMemberId } = useFamilyContext()
	const { knowledge, refetch } = useVehicleContext()
	const { assignments, refresh } = useVehicleSources(userId)
	const driveConnector = useGoogleDriveConnector(userId)
	const [folderPickerOpen, setFolderPickerOpen] = useState(false)
	const [isScanning, setIsScanning] = useState(false)

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

	const vehicleDocumentCount = useMemo(() => {
		if (!userId || !selectedMember) {
			return 0
		}

		return resolveModuleLibraryDocumentCount({
			moduleId: 'vehicles',
			query: buildModuleProviderQuery({
				userId,
				memberNames: { [selectedMember.id]: selectedMember.displayName },
				healthReports: [],
				chronicleDocuments: [],
				insuranceKnowledge: null,
				vehicleKnowledge: knowledge,
			}),
		})
	}, [knowledge, selectedMember, userId])

	if (!userId || !selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are managing vehicle settings for."
				emoji="🚗"
			/>
		)
	}

	const handleForceRescan = async () => {
		setIsScanning(true)

		try {
			if (driveConnector.connectionStatus === 'connected') {
				await driveConnector.sync()
			} else {
				await runVehicleImportSync(userId)
			}

			await refresh()
			await refetch()
		} finally {
			setIsScanning(false)
		}
	}

	const lastScanned = formatLastScannedLabel(memberAssignment?.assignedAt)

	return (
		<div style={{ paddingBottom: 28 }}>
			<ModuleSettingsSection label="Connected folder">
				<ModuleSettingsConnectedFolderCard
					moduleLabel="Vehicles"
					setupHeadline="Connect your Vehicles folder"
					setupMessage="Chronicle will organize vehicle records and documents found inside this folder."
					setupActionLabel="Connect Vehicles folder"
					driveDisconnectedMessage="Connect Google Drive, then connect your Vehicles folder. Chronicle will organize vehicle records and documents found inside this folder."
					driveConnected={driveConnector.connectionStatus === 'connected'}
					driveLabel={
						driveConnector.connectionStatus === 'connected'
							? 'Google Drive connected'
							: 'Reconnect Google Drive to continue'
					}
					folderName={memberAssignment?.folderName ?? null}
					folderPath={memberAssignment?.folderPath ?? null}
					documentCount={vehicleDocumentCount}
					lastScannedLabel={lastScanned}
					onConnectDrive={() => navigate(ROUTES.profileConnectionsDrive)}
					onChangeFolder={() => setFolderPickerOpen(true)}
					onOpenFolder={() => setFolderPickerOpen(true)}
					isLoading={isScanning}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Privacy">
				<div
					style={{ ...figmaCardStyle, borderRadius: 20, padding: '16px 18px' }}
				>
					<p style={{ color: FC.fg, fontSize: 14, margin: '0 0 6px' }}>
						Vehicle documents stay in your connected folder.
					</p>
					<p
						style={{ color: FC.mid, fontSize: 13, lineHeight: 1.5, margin: 0 }}
					>
						Chronicle does not share registration numbers, insurance details, or
						service records outside your account.
					</p>
				</div>
			</ModuleSettingsSection>

			<ModuleSettingsAdvancedSection label="Advanced">
				<button
					type="button"
					disabled={!memberAssignment || isScanning}
					onClick={() => void handleForceRescan()}
					style={{
						width: '100%',
						...figmaCardStyle,
						borderRadius: 18,
						padding: '14px 16px',
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
						opacity: !memberAssignment || isScanning ? 0.6 : 1,
					}}
				>
					{isScanning ? 'Checking…' : 'Check for new documents'}
				</button>
			</ModuleSettingsAdvancedSection>

			{selectedMember ? (
				<p style={{ color: FC.dim, fontSize: 12, marginTop: 8 }}>
					Managed for {formatMemberLabel(selectedMember)}.
				</p>
			) : null}

			<VehicleModuleFolderPicker
				userId={userId}
				open={folderPickerOpen}
				onClose={() => setFolderPickerOpen(false)}
				onAssigned={() => {
					void refresh()
					void refetch()
				}}
			/>
		</div>
	)
}
