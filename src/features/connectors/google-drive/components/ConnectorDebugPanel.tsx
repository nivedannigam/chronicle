import { getDriveApiDebugLog } from '@/features/connectors/google-drive/services/google-drive-api.service'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { C } from '@/constants/colors'
import { IMPORT_QUEUE_LABELS } from '@/core/connectors'

interface ConnectorDebugPanelProps {
	userId: string
}

export function ConnectorDebugPanel({ userId }: ConnectorDebugPanelProps) {
	if (!import.meta.env.DEV) {
		return null
	}

	return <ConnectorDebugPanelContent userId={userId} />
}

function ConnectorDebugPanelContent({ userId }: ConnectorDebugPanelProps) {
	const connector = useGoogleDriveConnector(userId)
	const apiLog = getDriveApiDebugLog()

	return (
		<div style={{ marginTop: 24 }}>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.orange,
					marginBottom: 12,
				}}
			>
				Connector Debug (Dev Only)
			</div>
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.orange}44`,
					borderRadius: 18,
					padding: 16,
					fontSize: 12,
					color: C.textSec,
					lineHeight: 1.6,
				}}
			>
				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>API Calls</strong>
					{apiLog.slice(0, 8).map((entry) => (
						<div key={`${entry.timestamp}-${entry.action}`}>
							{entry.action} · {entry.durationMs}ms ·{' '}
							{entry.success ? 'ok' : `fail: ${entry.detail}`}
						</div>
					))}
				</div>

				<div style={{ marginBottom: 12 }}>
					<strong style={{ color: C.text }}>Registry</strong>
					<div>{connector.registry.length} records</div>
				</div>

				<div>
					<strong style={{ color: C.text }}>Queue / Status</strong>
					{connector.registry.slice(0, 10).map((record) => (
						<div key={record.id}>
							{record.fileName} · {IMPORT_QUEUE_LABELS[record.importStatus]}
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
