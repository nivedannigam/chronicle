import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { connectedServices } from '@/features/more/constants/connected-services'
import { getConnectorConnection } from '@/features/connectors/services/connector-store.service'

export function ConnectedServicesPanel() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const [driveConnected, setDriveConnected] = useState(false)
	const [driveEmail, setDriveEmail] = useState<string | null>(null)

	useEffect(() => {
		if (!user?.id) {
			return
		}

		void getConnectorConnection(user.id, 'google-drive').then((connection) => {
			const settings =
				(connection?.settings as { googleEmail?: string } | undefined) ?? {}
			setDriveConnected(connection?.status === 'connected')
			setDriveEmail(settings.googleEmail ?? null)
		})
	}, [user?.id])

	const handleServiceClick = (serviceId: string) => {
		if (serviceId === 'google-drive') {
			navigate(ROUTES.settingsConnectorsDrive)
		}
	}

	return (
		<div
			style={{
				background: C.card,
				borderRadius: 16,
				overflow: 'hidden',
				border: `1px solid ${C.border}`,
			}}
		>
			{connectedServices.map((service, index) => {
				const isConnected =
					service.id === 'google-account'
						? true
						: service.id === 'google-drive'
							? driveConnected
							: service.status === 'connected'
				const statusLabel =
					service.id === 'google-drive'
						? driveConnected
							? (driveEmail ?? 'Connected')
							: 'Tap to connect'
						: service.statusLabel
				const isClickable = service.id === 'google-drive'

				return (
					<div
						key={service.id}
						onClick={
							isClickable ? () => handleServiceClick(service.id) : undefined
						}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 14,
							padding: '14px 16px',
							borderBottom:
								index < connectedServices.length - 1
									? `1px solid ${C.border}`
									: 'none',
							opacity: isConnected || isClickable ? 1 : 0.55,
							cursor: isClickable ? 'pointer' : 'default',
						}}
					>
						<div
							style={{
								width: 36,
								height: 36,
								borderRadius: 11,
								background: isConnected
									? 'rgba(52,211,153,0.12)'
									: 'rgba(255,255,255,0.06)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
							}}
						>
							<service.Icon
								size={18}
								color={isConnected ? C.greenAlt : C.textSec}
								strokeWidth={1.6}
							/>
						</div>
						<div style={{ flex: 1 }}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 6,
									fontSize: 15,
									fontWeight: 600,
									color: C.text,
									marginBottom: 2,
								}}
							>
								{isConnected ? (
									<Check size={14} color={C.greenAlt} strokeWidth={2.5} />
								) : null}
								{service.name}
							</div>
							<div
								style={{
									fontSize: 12,
									color: isConnected ? C.greenAlt : C.textMuted,
									fontWeight: isConnected ? 600 : 400,
								}}
							>
								{statusLabel}
							</div>
						</div>
						{isClickable ? (
							<ChevronRight size={16} color={C.textMuted} />
						) : null}
					</div>
				)
			})}
		</div>
	)
}
