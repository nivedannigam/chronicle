import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { ConnectorDebugPanel } from '@/features/connectors/google-drive/components/ConnectorDebugPanel'
import '@/features/connectors/services/connector-bootstrap'

export function ConnectorDebugPage() {
	const navigate = useNavigate()
	const { user } = useAuth()

	if (!import.meta.env.DEV) {
		return null
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.connectorsGoogleDrive)}
				style={{
					background: 'none',
					border: 'none',
					color: C.textSec,
					cursor: 'pointer',
					padding: 0,
					marginBottom: 16,
					fontFamily: 'inherit',
					fontSize: 13,
				}}
			>
				← Back to Google Drive
			</button>

			<div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
				Connector Debug
			</div>
			<div style={{ fontSize: 14, color: C.textSec, marginBottom: 20 }}>
				Inspect sync queue, registry, API calls, and processing status.
			</div>

			{user?.id ? <ConnectorDebugPanel userId={user.id} /> : null}
		</div>
	)
}
