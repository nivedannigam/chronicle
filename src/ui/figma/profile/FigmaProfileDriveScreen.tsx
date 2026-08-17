import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, type LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ConnectorSettingsPanel } from '@/features/connectors/google-drive/components/ConnectorSettingsPanel'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { useInsuranceSources } from '@/features/insurance/hooks/useInsuranceSources'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'
import {
	ProfilePageShell,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'

function formatLastSync(isoDate: string | null | undefined): string {
	if (!isoDate) return 'Never synced'

	const date = new Date(isoDate)
	if (Number.isNaN(date.getTime())) return 'Never synced'

	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

function buildFolderModuleLabels(input: {
	folderIds: string[]
	healthFolderIds: Set<string>
	insuranceFolderIds: Set<string>
	vehicleFolderIds: Set<string>
}): Map<string, string[]> {
	const labels = new Map<string, string[]>()

	for (const folderId of input.folderIds) {
		const modules: string[] = []

		if (input.healthFolderIds.has(folderId)) {
			modules.push('Health')
		}

		if (input.insuranceFolderIds.has(folderId)) {
			modules.push('Insurance')
		}

		if (input.vehicleFolderIds.has(folderId)) {
			modules.push('Vehicles')
		}

		labels.set(folderId, modules)
	}

	return labels
}

function formatFolderSummary(
	folders: Array<{ id: string; alias: string; displayName: string }>,
	moduleLabels: Map<string, string[]>,
): string {
	return folders
		.slice(0, 3)
		.map((folder) => {
			const name = folder.alias || folder.displayName
			const modules = moduleLabels.get(folder.id) ?? []

			if (modules.length === 0) {
				return name
			}

			return `${name} (${modules.join(', ')})`
		})
		.join(' · ')
}

export function FigmaProfileDriveScreen() {
	const navigate = useNavigate()
	const { user, session } = useAuth()
	const userId = user?.id
	const { connectionStatus, finalizeOAuthReturn, refresh, ...connector } =
		useGoogleDriveConnector(userId)
	const { assignments: healthAssignments } = useHealthSources(userId)
	const { assignments: insuranceAssignments } = useInsuranceSources(userId)
	const { moduleAssignments: vehicleAssignments } = useVehicleSources(userId)
	const lastFinalizedTokenRef = useRef<string | null>(null)

	useEffect(() => {
		const providerToken = session?.provider_token

		if (!userId || !providerToken) {
			return
		}

		if (lastFinalizedTokenRef.current === providerToken) {
			return
		}

		lastFinalizedTokenRef.current = providerToken
		logConnectorRequest(
			'FigmaProfileDriveScreen',
			'drive-connector',
			'OAuth return finalize',
		)

		void finalizeOAuthReturn({
			provider_token: providerToken,
			provider_refresh_token: session.provider_refresh_token,
		})
	}, [
		userId,
		session?.provider_token,
		session?.provider_refresh_token,
		finalizeOAuthReturn,
	])

	const { enabledFolders, folderModuleLabels } = useMemo(() => {
		const enabled = connector.folders.filter((folder) => folder.enabled)

		return {
			enabledFolders: enabled,
			folderModuleLabels: buildFolderModuleLabels({
				folderIds: enabled.map((folder) => folder.id),
				healthFolderIds: new Set(healthAssignments.map((a) => a.folderId)),
				insuranceFolderIds: new Set(
					insuranceAssignments.map((a) => a.folderId),
				),
				vehicleFolderIds: new Set(vehicleAssignments.map((a) => a.folderId)),
			}),
		}
	}, [
		connector.folders,
		healthAssignments,
		insuranceAssignments,
		vehicleAssignments,
	])

	if (!userId) {
		return null
	}

	const isConnected = connectionStatus === 'connected'
	const lastSync =
		connector.latestSync?.completedAt ?? connector.latestSync?.startedAt

	const connectorState = {
		connectionStatus,
		finalizeOAuthReturn,
		refresh,
		...connector,
	}

	return (
		<ProfilePageShell
			title="Google Drive"
			subtitle="Connection and sync management"
			backLabel="Connected Accounts"
			onBack={() => navigate(ROUTES.profileConnections)}
		>
			<ConnectorSettingsPanel
				connector={connectorState}
				onChanged={() => void refresh('ProfileDrive.onChanged')}
			/>

			{isConnected ? (
				<>
					<ProfileSectionCard title="Sync">
						<div style={{ padding: '14px 18px' }}>
							<InfoRow label="Last sync" value={formatLastSync(lastSync)} />
							<InfoRow
								label="Chronicle folders"
								value={
									enabledFolders.length > 0
										? `${enabledFolders.length} enabled`
										: 'None configured'
								}
							/>
							{enabledFolders.length > 0 ? (
								<p
									style={{
										color: FC.dim,
										fontSize: 12.5,
										margin: '10px 0 0',
										lineHeight: 1.45,
									}}
								>
									{formatFolderSummary(enabledFolders, folderModuleLabels)}
									{enabledFolders.length > 3
										? ` · +${enabledFolders.length - 3} more`
										: ''}
								</p>
							) : null}

							<div
								style={{
									display: 'flex',
									gap: 8,
									marginTop: 16,
									flexWrap: 'wrap',
								}}
							>
								<ActionButton
									icon={FolderOpen}
									label="Health folders"
									onClick={() => navigate(ROUTES.healthFolderSetup)}
								/>
								<ActionButton
									icon={FolderOpen}
									label="Insurance folders"
									tone="secondary"
									onClick={() => navigate(ROUTES.insuranceSettings)}
								/>
								<ActionButton
									icon={FolderOpen}
									label="Vehicle folders"
									tone="secondary"
									onClick={() => navigate(ROUTES.vehiclesSettings)}
								/>
							</div>
						</div>
					</ProfileSectionCard>

					<ProfileSectionCard title="Import stats">
						<div style={{ padding: '14px 18px' }}>
							<InfoRow
								label="Files imported"
								value={String(connector.stats.filesImported)}
							/>
							<InfoRow
								label="Pending"
								value={String(connector.stats.filesPending)}
							/>
							<InfoRow
								label="Failed"
								value={String(connector.stats.filesFailed)}
								isLast
							/>
						</div>
					</ProfileSectionCard>
				</>
			) : null}

			<p
				style={{
					color: FC.dim,
					fontSize: 12.5,
					lineHeight: 1.5,
					margin: '4px 0 0',
					padding: '0 4px',
				}}
			>
				Chronicle uses read-only access. Assign folders separately in Health,
				Insurance, and Vehicles settings — this page only shows the shared Drive
				connection and import totals.
			</p>
		</ProfilePageShell>
	)
}

function InfoRow({
	label,
	value,
	isLast = false,
}: {
	label: string
	value: string
	isLast?: boolean
}) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				gap: 12,
				paddingBottom: isLast ? 0 : 10,
				marginBottom: isLast ? 0 : 10,
				borderBottom: isLast ? 'none' : `1px solid ${FC.line}`,
				fontSize: 14,
			}}
		>
			<span style={{ color: FC.mid }}>{label}</span>
			<span style={{ color: FC.fg, fontWeight: 600, textAlign: 'right' }}>
				{value}
			</span>
		</div>
	)
}

function ActionButton({
	label,
	onClick,
	disabled = false,
	tone = 'primary',
	icon: Icon,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
	tone?: 'primary' | 'secondary'
	icon?: LucideIcon
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: tone === 'primary' ? FC.blue : FC.surface,
				border: `1px solid ${tone === 'primary' ? FC.blue : FC.line}`,
				borderRadius: 100,
				padding: '10px 16px',
				fontSize: 13,
				fontWeight: 700,
				color: tone === 'primary' ? '#fff' : FC.fg,
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.6 : 1,
				fontFamily: 'inherit',
				minHeight: 44,
			}}
		>
			{Icon ? <Icon size={15} /> : null}
			{label}
		</button>
	)
}
