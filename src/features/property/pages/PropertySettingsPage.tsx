import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentsCategoryPath, ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { PropertyModuleFolderPicker } from '@/features/property/components/PropertyModuleFolderPicker'
import { usePropertyContext } from '@/features/property/context/usePropertyContext'
import { usePropertySources } from '@/features/property/hooks/usePropertySources'
import {
	formatPropertyIntegrityAuditReport,
	runPropertyIntegrityAudit,
} from '@/features/property-knowledge'
import { formatLastScannedLabel } from '@/features/settings/services/module-folder-assignments.service'
import {
	ModuleSettingsAdvancedSection,
	ModuleSettingsConnectedFolderCard,
	ModuleSettingsSection,
} from '@/ui/figma/settings/module-settings-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function PropertySettingsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const documentsQuery = useMemberDocuments()
	const { knowledge, refetch } = usePropertyContext()
	const { assignments, refresh, clearAll } = usePropertySources(userId)
	const driveConnector = useGoogleDriveConnector(userId)
	const [folderPickerOpen, setFolderPickerOpen] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [auditReport, setAuditReport] = useState<string | null>(null)

	const assignment = assignments[0] ?? null
	const lastScanned = formatLastScannedLabel(assignment?.assignedAt)

	const handleRefresh = async () => {
		if (!userId) return
		setIsScanning(true)

		try {
			if (driveConnector.connectionStatus === 'connected') {
				await driveConnector.sync()
			}
			await refresh()
			await refetch()
		} finally {
			setIsScanning(false)
		}
	}

	return (
		<div style={{ paddingBottom: 28 }}>
			<ModuleSettingsSection label="Connected folder">
				<ModuleSettingsConnectedFolderCard
					moduleLabel="Property"
					driveConnected={driveConnector.connectionStatus === 'connected'}
					driveLabel={
						driveConnector.connectionStatus === 'connected'
							? 'Google Drive connected'
							: 'Reconnect Google Drive to continue'
					}
					folderName={assignment?.folderName ?? null}
					folderPath={assignment?.folderPath ?? null}
					documentCount={knowledge.summary.documentCount}
					lastScannedLabel={lastScanned}
					onConnectDrive={() => navigate(ROUTES.profileConnectionsDrive)}
					onChangeFolder={() => setFolderPickerOpen(true)}
					onOpenFolder={() => setFolderPickerOpen(true)}
					isLoading={isScanning}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Privacy">
				<div
					style={{ ...figmaCardStyle, borderRadius: 18, padding: '14px 16px' }}
				>
					<p
						style={{
							color: FC.fg,
							fontSize: 14,
							fontWeight: 600,
							margin: '0 0 6px',
						}}
					>
						Sensitive property details
					</p>
					<p
						style={{ color: FC.dim, fontSize: 13, margin: 0, lineHeight: 1.5 }}
					>
						Registration numbers and legal identifiers are masked in Search,
						Timeline, and summary cards. Full details remain available in
						document view.
					</p>
				</div>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Shortcuts">
				<button
					type="button"
					onClick={() => navigate(documentsCategoryPath('property'))}
					style={{
						...figmaCardStyle,
						width: '100%',
						borderRadius: 16,
						padding: '12px 14px',
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
					}}
				>
					Open property documents in Library →
				</button>
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
				{import.meta.env.DEV ? (
					<button
						type="button"
						onClick={() => {
							if (!userId) return
							const audit = runPropertyIntegrityAudit({
								userId,
								documents: documentsQuery.allDocuments,
								hasFolderAssigned: assignments.length > 0,
								rootFolderPath:
									assignment?.folderPath ?? assignment?.folderName ?? null,
							})
							setAuditReport(formatPropertyIntegrityAuditReport(audit))
						}}
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
						Run integrity check
					</button>
				) : null}
				{auditReport && import.meta.env.DEV ? (
					<pre
						style={{
							...figmaCardStyle,
							borderRadius: 18,
							padding: '14px 16px',
							color: FC.dim,
							fontSize: 11,
							whiteSpace: 'pre-wrap',
							margin: 0,
							maxHeight: 240,
							overflow: 'auto',
						}}
					>
						{auditReport}
					</pre>
				) : null}
				<button
					type="button"
					disabled={!assignment}
					onClick={() => {
						if (
							!window.confirm(
								'Disconnect your Home folder from Property? Your documents stay in Library.',
							)
						) {
							return
						}
						void clearAll()
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

			<PropertyModuleFolderPicker
				userId={userId ?? ''}
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
