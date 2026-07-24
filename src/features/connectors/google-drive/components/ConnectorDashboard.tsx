import { C } from '@/constants/colors'
import {
	CONNECTION_STATUS_LABELS,
	IMPORT_QUEUE_LABELS,
} from '@/core/connectors'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import type { ConnectorFolder } from '@/core/connectors'

function formatWhen(value: string | null | undefined): string {
	if (!value) {
		return 'Never'
	}

	return new Date(value).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

interface ConnectorDashboardProps {
	userId: string
	folders: ConnectorFolder[]
	onRefresh: () => void
}

export function ConnectorDashboard({
	userId,
	folders,
	onRefresh,
}: ConnectorDashboardProps) {
	const connector = useGoogleDriveConnector(userId)

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 16,
				marginBottom: 24,
			}}
		>
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: 16,
				}}
			>
				<div
					style={{
						fontSize: 15,
						fontWeight: 700,
						color: C.text,
						marginBottom: 12,
					}}
				>
					Discovery Status
				</div>
				<div
					style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
				>
					<Stat
						label="Connection"
						value={CONNECTION_STATUS_LABELS[connector.connectionStatus]}
					/>
					<Stat
						label="Folders"
						value={String(connector.stats.foldersConnected)}
					/>
					<Stat
						label="Imported"
						value={String(connector.stats.filesImported)}
					/>
					<Stat label="Pending" value={String(connector.stats.filesPending)} />
					<Stat label="Failed" value={String(connector.stats.filesFailed)} />
					<Stat
						label="Last Sync"
						value={formatWhen(
							connector.latestSync?.completedAt ??
								connector.latestSync?.startedAt,
						)}
					/>
				</div>

				{connector.error ? (
					<div style={{ fontSize: 12, color: C.red, marginTop: 12 }}>
						{connector.error}
					</div>
				) : null}

				<div
					style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}
				>
					<ActionButton
						label={connector.isSyncing ? 'Scanning…' : 'Scan Folders'}
						onClick={() => void connector.sync('manual').then(onRefresh)}
						disabled={
							connector.isSyncing || connector.connectionStatus !== 'connected'
						}
					/>
					<ActionButton
						label="Retry Failed"
						onClick={() => void connector.retryFailed().then(onRefresh)}
						disabled={connector.isSyncing || connector.stats.filesFailed === 0}
					/>
				</div>
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: 16,
				}}
			>
				<div
					style={{
						fontSize: 15,
						fontWeight: 700,
						color: C.text,
						marginBottom: 12,
					}}
				>
					Selected Folders
				</div>
				{folders.length === 0 ? (
					<div style={{ fontSize: 13, color: C.textMuted }}>
						No folders selected yet. Add folders below to start discovery.
					</div>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{folders.map((folder) => (
							<div
								key={folder.id}
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									gap: 12,
									padding: '10px 12px',
									borderRadius: 12,
									background: C.card2,
								}}
							>
								<div>
									<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
										{folder.alias}
									</div>
									<div style={{ fontSize: 11, color: C.textMuted }}>
										{folder.displayName}
									</div>
								</div>
								<span
									style={{
										fontSize: 11,
										color: folder.enabled ? C.greenAlt : C.textMuted,
										fontWeight: 700,
									}}
								>
									{folder.enabled ? 'Enabled' : 'Disabled'}
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: 16,
				}}
			>
				<div
					style={{
						fontSize: 15,
						fontWeight: 700,
						color: C.text,
						marginBottom: 12,
					}}
				>
					Recent Imports
				</div>
				{connector.registry.slice(0, 6).map((record) => (
					<div
						key={record.id}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							gap: 12,
							padding: '8px 0',
							borderBottom: `1px solid ${C.border}`,
							fontSize: 12,
							color: C.textSec,
						}}
					>
						<span>{record.fileName}</span>
						<span>{IMPORT_QUEUE_LABELS[record.importStatus]}</span>
					</div>
				))}
			</div>
		</div>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				background: C.card2,
				borderRadius: 12,
				padding: '10px 12px',
			}}
		>
			<div
				style={{
					fontSize: 10,
					color: C.textMuted,
					marginBottom: 4,
					textTransform: 'uppercase',
				}}
			>
				{label}
			</div>
			<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
				{value}
			</div>
		</div>
	)
}

function ActionButton({
	label,
	onClick,
	disabled,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				background: C.accent,
				border: 'none',
				borderRadius: 100,
				padding: '8px 14px',
				fontSize: 12,
				fontWeight: 700,
				color: C.white,
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.6 : 1,
				fontFamily: 'inherit',
			}}
		>
			{label}
		</button>
	)
}
