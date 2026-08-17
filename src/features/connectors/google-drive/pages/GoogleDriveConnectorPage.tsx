import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import '@/features/connectors/services/connector-bootstrap'
import { ConnectorSettingsPanel } from '@/features/connectors/google-drive/components/ConnectorSettingsPanel'
import { DriveBrowser } from '@/features/connectors/google-drive/components/DriveBrowser'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'

export function GoogleDriveConnectorPage() {
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
			'GoogleDriveConnectorPage',
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

	const connectorState = {
		connectionStatus,
		finalizeOAuthReturn,
		refresh,
		...connector,
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.modules)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 16,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Google Drive
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				Connect your Google Drive account with read-only access. Once connected,
				Chronicle can access your health documents in a later step.
			</div>

			<ConnectorSettingsPanel
				connector={connectorState}
				onChanged={() => void refresh('ConnectorSettingsPanel.onChanged')}
			/>

			{connectionStatus === 'connected' ? (
				<DriveBrowser userId={userId} />
			) : null}

			{import.meta.env.DEV ? (
				<button
					type="button"
					onClick={() => navigate(ROUTES.connectorsDebug)}
					style={{
						marginTop: 12,
						background: 'none',
						border: 'none',
						color: C.textMuted,
						cursor: 'pointer',
						fontFamily: 'inherit',
						fontSize: 12,
					}}
				>
					Open Connector Debug →
				</button>
			) : null}
		</div>
	)
}
