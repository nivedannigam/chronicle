import { C } from '@/constants/colors'
import type { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'

type GoogleDriveConnectorState = ReturnType<typeof useGoogleDriveConnector>

interface ConnectorSettingsPanelProps {
	connector: GoogleDriveConnectorState
	onChanged: () => void
}

export function ConnectorSettingsPanel({
	connector,
	onChanged,
}: ConnectorSettingsPanelProps) {
	const isConnected = connector.connectionStatus === 'connected'

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: 16,
				marginBottom: 24,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 16,
				}}
			>
				<div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
					Google Drive
				</div>
				{isConnected ? <ConnectedBadge /> : null}
			</div>

			{connector.isConnecting ? (
				<div style={{ fontSize: 13, color: C.textSec, marginBottom: 14 }}>
					Connecting to Google Drive…
				</div>
			) : null}

			{connector.error ? (
				<div
					style={{
						fontSize: 13,
						color: C.red,
						marginBottom: 14,
						lineHeight: 1.5,
					}}
				>
					{connector.error}
				</div>
			) : null}

			{connector.lastError && !isConnected ? (
				<div
					style={{
						fontSize: 13,
						color: C.red,
						marginBottom: 14,
						lineHeight: 1.5,
					}}
				>
					{connector.lastError}
				</div>
			) : null}

			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				<SettingRow
					label="Status"
					value={
						isConnected
							? 'Connected'
							: formatStatusLabel(connector.connectionStatus)
					}
				/>
				{isConnected && connector.googleEmail ? (
					<SettingRow label="Google account" value={connector.googleEmail} />
				) : null}
				{isConnected && connector.connectedAt ? (
					<SettingRow
						label="Last connected"
						value={formatConnectedAt(connector.connectedAt)}
					/>
				) : null}
			</div>

			<div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
				{isConnected ? (
					<SettingsButton
						label="Disconnect Google Drive"
						tone="danger"
						onClick={() => void connector.disconnect().then(onChanged)}
					/>
				) : (
					<SettingsButton
						label="Connect Google Drive"
						disabled={connector.isConnecting}
						onClick={() => void connector.connect()}
					/>
				)}
			</div>
		</div>
	)
}

function ConnectedBadge() {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: 'rgba(52,211,153,0.12)',
				border: '1px solid rgba(52,211,153,0.25)',
				borderRadius: 100,
				padding: '4px 10px',
				fontSize: 12,
				fontWeight: 700,
				color: C.greenAlt,
			}}
		>
			<span
				style={{
					width: 7,
					height: 7,
					borderRadius: '50%',
					background: C.greenAlt,
				}}
			/>
			Connected
		</span>
	)
}

function formatStatusLabel(status: string) {
	switch (status) {
		case 'connecting':
			return 'Connecting…'
		case 'permission_revoked':
			return 'Access revoked'
		case 'error':
			return 'Connection error'
		default:
			return 'Not connected'
	}
}

function formatConnectedAt(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value))
}

function SettingRow({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				gap: 12,
				fontSize: 13,
			}}
		>
			<span style={{ color: C.textMuted }}>{label}</span>
			<span style={{ color: C.textSec, fontWeight: 600, textAlign: 'right' }}>
				{value}
			</span>
		</div>
	)
}

function SettingsButton({
	label,
	onClick,
	tone = 'default',
	disabled = false,
}: {
	label: string
	onClick: () => void
	tone?: 'default' | 'danger'
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				background: tone === 'danger' ? 'rgba(239,68,68,0.12)' : C.accent,
				border: `1px solid ${tone === 'danger' ? 'rgba(239,68,68,0.25)' : C.accent}`,
				borderRadius: 100,
				padding: '10px 16px',
				fontSize: 13,
				fontWeight: 700,
				color: tone === 'danger' ? C.red : C.white,
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.6 : 1,
				fontFamily: 'inherit',
			}}
		>
			{label}
		</button>
	)
}
