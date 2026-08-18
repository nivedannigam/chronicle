import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES, documentsCategoryPath } from '@/constants/routes'
import { C } from '@/constants/colors'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { IdentityModuleFolderPicker } from '@/features/identity/components/IdentityModuleFolderPicker'
import { useIdentityContext } from '@/features/identity/context/useIdentityContext'
import { useIdentitySources } from '@/features/identity/hooks/useIdentitySources'
import { runIdentityImportSync } from '@/features/identity-import/services/identity-import-runner.service'
import {
	readIdentityPreferences,
	writeIdentityPreferences,
} from '@/features/identity-knowledge'
import { formatLastScannedLabel } from '@/features/settings/services/module-folder-assignments.service'
import {
	ModuleSettingsAdvancedSection,
	ModuleSettingsConnectedFolderCard,
	ModuleSettingsSection,
} from '@/ui/figma/settings/module-settings-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function IdentitySettingsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember } = useFamilyContext()
	const { knowledge, refetch } = useIdentityContext()
	const { assignments, refresh, clearAll } = useIdentitySources(userId)
	const driveConnector = useGoogleDriveConnector(userId)
	const [folderPickerOpen, setFolderPickerOpen] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [preferences, setPreferences] = useState(() =>
		userId ? readIdentityPreferences(userId) : readIdentityPreferences(''),
	)

	const assignment = assignments[0] ?? null
	const lastScanned = formatLastScannedLabel(assignment?.assignedAt)

	const handleRefresh = async () => {
		if (!userId) return
		setIsScanning(true)

		try {
			if (driveConnector.connectionStatus === 'connected') {
				await driveConnector.sync()
			}
			await runIdentityImportSync(userId)
			await refresh()
			await refetch()
		} finally {
			setIsScanning(false)
		}
	}

	const updatePreference = (
		key: 'maskDocumentNumbers' | 'hideSensitiveTimelinePreviews',
		value: boolean,
	) => {
		if (!userId) return
		const next = writeIdentityPreferences(userId, { [key]: value })
		setPreferences(next)
	}

	return (
		<div style={{ paddingBottom: 28 }}>
			<ModuleSettingsSection label="Connected folder">
				<ModuleSettingsConnectedFolderCard
					moduleLabel="Identity"
					driveConnected={driveConnector.connectionStatus === 'connected'}
					driveLabel={
						driveConnector.connectionStatus === 'connected'
							? 'Google Drive connected'
							: 'Reconnect Google Drive to continue'
					}
					folderName={assignment?.folderName ?? null}
					folderPath={assignment?.folderPath ?? null}
					documentCount={knowledge.documentCount}
					lastScannedLabel={lastScanned}
					onConnectDrive={() => navigate(ROUTES.profileConnectionsDrive)}
					onChangeFolder={() => setFolderPickerOpen(true)}
					onOpenFolder={() => setFolderPickerOpen(true)}
					isLoading={isScanning}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Family">
				<div
					style={{ ...figmaCardStyle, borderRadius: 20, padding: '16px 18px' }}
				>
					<p style={{ color: FC.fg, fontSize: 14, margin: '0 0 6px' }}>
						Documents are organized by family member.
					</p>
					<button
						type="button"
						onClick={() => navigate(ROUTES.profileFamily)}
						style={{
							background: 'none',
							border: 'none',
							padding: 0,
							color: C.accentBlue,
							fontSize: 13,
							fontWeight: 600,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Manage family in You → Family
					</button>
				</div>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Privacy">
				<PreferenceToggle
					label="Mask document numbers in lists"
					checked={preferences.maskDocumentNumbers}
					onChange={(checked) =>
						updatePreference('maskDocumentNumbers', checked)
					}
				/>
				<PreferenceToggle
					label="Hide sensitive details in Timeline previews"
					checked={preferences.hideSensitiveTimelinePreviews}
					onChange={(checked) =>
						updatePreference('hideSensitiveTimelinePreviews', checked)
					}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsAdvancedSection label="Advanced">
				<button
					type="button"
					disabled={!assignment || isScanning}
					onClick={() => void handleRefresh()}
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
						opacity: !assignment || isScanning ? 0.6 : 1,
					}}
				>
					{isScanning ? 'Refreshing documents…' : 'Refresh documents'}
				</button>
				<button
					type="button"
					onClick={() => navigate(documentsCategoryPath('identity'))}
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
					}}
				>
					Browse all in Library
				</button>
				<button
					type="button"
					disabled={!assignment}
					onClick={() => {
						if (!userId) return
						void clearAll().then(() => refetch())
					}}
					style={{
						width: '100%',
						...figmaCardStyle,
						borderRadius: 18,
						padding: '14px 16px',
						color: FC.red,
						fontSize: 14,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
						opacity: !assignment ? 0.6 : 1,
					}}
				>
					Disconnect folder
				</button>
			</ModuleSettingsAdvancedSection>

			{selectedMember ? (
				<p style={{ color: FC.dim, fontSize: 12, marginTop: 8 }}>
					Managed for {formatMemberLabel(selectedMember)}.
				</p>
			) : null}

			{userId ? (
				<IdentityModuleFolderPicker
					userId={userId}
					open={folderPickerOpen}
					onClose={() => setFolderPickerOpen(false)}
					onAssigned={() => {
						void refresh()
						void refetch()
					}}
				/>
			) : null}
		</div>
	)
}

function PreferenceToggle({
	label,
	checked,
	onChange,
}: {
	label: string
	checked: boolean
	onChange: (checked: boolean) => void
}) {
	return (
		<label
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 12,
				cursor: 'pointer',
			}}
		>
			<span style={{ color: FC.fg, fontSize: 14 }}>{label}</span>
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
			/>
		</label>
	)
}
