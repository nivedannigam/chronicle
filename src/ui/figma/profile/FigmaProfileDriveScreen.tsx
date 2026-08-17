import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ConnectorSettingsPanel } from '@/features/connectors/google-drive/components/ConnectorSettingsPanel'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
import { readChronicleSetupState } from '@/features/setup/services/chronicle-setup.service'
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
	const setupState = readChronicleSetupState()

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

	const rootFolderLabel = useMemo(() => {
		if (setupState.rootFolder?.folderPath) {
			return `/${setupState.rootFolder.folderPath}`
		}

		if (setupState.rootFolder?.folderName) {
			return `/${setupState.rootFolder.folderName}`
		}

		const enabled = connector.folders.filter((folder) => folder.enabled)
		if (enabled.length === 1) {
			return `/${enabled[0]?.alias || enabled[0]?.displayName || 'Chronicle'}`
		}

		return enabled.length > 0 ? `${enabled.length} folders connected` : null
	}, [connector.folders, setupState.rootFolder])

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
			subtitle="Your connected document source"
			backLabel="Connected services"
			onBack={() => navigate(ROUTES.profileConnections)}
		>
			<ConnectorSettingsPanel
				connector={connectorState}
				onChanged={() => void refresh('ProfileDrive.onChanged')}
			/>

			{isConnected ? (
				<ProfileSectionCard title="Chronicle folder">
					<div style={{ padding: '14px 18px' }}>
						<InfoRow label="Status" value="Connected" />
						<InfoRow
							label="Chronicle root folder"
							value={rootFolderLabel ?? 'Not chosen yet'}
						/>
						<InfoRow
							label="Last sync"
							value={formatLastSync(lastSync)}
							isLast
						/>

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
								label="Change folder"
								onClick={() => navigate(ROUTES.setup)}
							/>
						</div>
					</div>
				</ProfileSectionCard>
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
				Chronicle uses read-only access. Choose your Chronicle folder during
				setup, or change it here anytime. Module-specific folders can be
				adjusted in each module's Settings.
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
	icon: Icon,
}: {
	label: string
	onClick: () => void
	icon?: typeof FolderOpen
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: FC.blue,
				border: `1px solid ${FC.blue}`,
				borderRadius: 100,
				padding: '10px 16px',
				fontSize: 13,
				fontWeight: 700,
				color: '#fff',
				cursor: 'pointer',
				fontFamily: 'inherit',
				minHeight: 44,
			}}
		>
			{Icon ? <Icon size={15} /> : null}
			{label}
		</button>
	)
}
