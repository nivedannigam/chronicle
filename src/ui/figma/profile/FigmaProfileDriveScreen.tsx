import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ConnectorSettingsPanel } from '@/features/connectors/google-drive/components/ConnectorSettingsPanel'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
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

export function FigmaProfileDriveScreen() {
	const navigate = useNavigate()
	const { user, session } = useAuth()
	const userId = user?.id
	const { connectionStatus, finalizeOAuthReturn, refresh, ...connector } =
		useGoogleDriveConnector(userId)
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

	if (!userId) {
		return null
	}

	const isConnected = connectionStatus === 'connected'
	const enabledFolders = connector.folders.filter((folder) => folder.enabled)
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
									{enabledFolders
										.slice(0, 3)
										.map((folder) => folder.alias || folder.displayName)
										.join(' · ')}
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
									icon={RefreshCw}
									label={connector.isSyncing ? 'Syncing…' : 'Rescan now'}
									disabled={connector.isSyncing}
									onClick={() => void connector.sync('manual')}
								/>
								<ActionButton
									label="Manage folders"
									tone="secondary"
									onClick={() => navigate(ROUTES.healthSettings)}
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
				Chronicle uses read-only access. Folder selection and document import
				are configured in Health setup.
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
	icon?: typeof RefreshCw
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
