import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES, documentsCategoryPath } from '@/constants/routes'
import { C } from '@/constants/colors'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { FinanceModuleFolderPicker } from '@/features/finance/components/FinanceModuleFolderPicker'
import { useFinanceContext } from '@/features/finance/context/useFinanceContext'
import { useFinanceSources } from '@/features/finance/hooks/useFinanceSources'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { runFinanceImportSync } from '@/features/finance-import/services/finance-import-runner.service'
import {
	readFinancePreferences,
	writeFinancePreferences,
	runFinanceIntegrityAudit,
	formatFinanceIntegrityAuditReport,
} from '@/features/finance-knowledge'
import { formatLastScannedLabel } from '@/features/settings/services/module-folder-assignments.service'
import {
	ModuleSettingsAdvancedSection,
	ModuleSettingsConnectedFolderCard,
	ModuleSettingsSection,
} from '@/ui/figma/settings/module-settings-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FinanceSettingsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember } = useFamilyContext()
	const { knowledge, refetch } = useFinanceContext()
	const { assignments, refresh, clearAll } = useFinanceSources(userId)
	const documentsQuery = useMemberDocuments()
	const driveConnector = useGoogleDriveConnector(userId)
	const [folderPickerOpen, setFolderPickerOpen] = useState(false)
	const [isScanning, setIsScanning] = useState(false)
	const [auditReport, setAuditReport] = useState<string | null>(null)
	const [preferences, setPreferences] = useState(() =>
		userId ? readFinancePreferences(userId) : readFinancePreferences(''),
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
			await runFinanceImportSync(userId)
			await refresh()
			await refetch()
		} finally {
			setIsScanning(false)
		}
	}

	const updatePreference = (key: keyof typeof preferences, value: boolean) => {
		if (!userId) return
		const next = writeFinancePreferences(userId, { [key]: value })
		setPreferences(next)
	}

	return (
		<div style={{ paddingBottom: 28 }}>
			<ModuleSettingsSection label="Connected folder">
				<ModuleSettingsConnectedFolderCard
					moduleLabel="Finance"
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

			<ModuleSettingsSection label="Privacy">
				<PreferenceToggle
					label="Mask account and card numbers"
					checked={preferences.maskAccountNumbers}
					onChange={(checked) =>
						updatePreference('maskAccountNumbers', checked)
					}
				/>
				<PreferenceToggle
					label="Hide balances in lists"
					checked={preferences.hideBalancesInLists}
					onChange={(checked) =>
						updatePreference('hideBalancesInLists', checked)
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

			<ModuleSettingsSection label="Family">
				<div
					style={{ ...figmaCardStyle, borderRadius: 20, padding: '16px 18px' }}
				>
					<p style={{ color: FC.fg, fontSize: 14, margin: '0 0 6px' }}>
						Financial documents can be organized by family member.
					</p>
					<button
						type="button"
						onClick={() => navigate(ROUTES.profileFamily)}
						style={{
							background: 'none',
							border: 'none',
							padding: 0,
							color: C.greenAlt,
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
					onClick={() => navigate(documentsCategoryPath('financial'))}
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
				{import.meta.env.DEV ? (
					<button
						type="button"
						onClick={() => {
							if (!userId) return
							const result = runFinanceIntegrityAudit({
								userId,
								documents: documentsQuery.data ?? [],
								knowledge,
								hasFolderAssigned: assignments.length > 0,
							})
							setAuditReport(formatFinanceIntegrityAuditReport(result))
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
				<FinanceModuleFolderPicker
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
