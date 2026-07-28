import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Cloud, Heart } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { ConnectedServicesPanel } from '@/features/settings/components/ConnectedServicesPanel'

const INTEGRATION_ITEMS = [
	{
		title: 'Google Drive',
		description: 'Bring documents and records from your Google account.',
		path: ROUTES.profileConnectionsDrive,
		Icon: Cloud,
	},
	{
		title: 'Health',
		description: 'Manage import sources and folder assignments.',
		path: ROUTES.healthSettings,
		Icon: Heart,
	},
] as const

export function IntegrationsPage() {
	const navigate = useNavigate()

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.profile)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 18,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Profile
			</button>

			<div
				style={{
					fontSize: 32,
					fontWeight: 700,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Integrations
			</div>
			<div style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>
				Connect the services that feed your family timeline.
			</div>

			<div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
				{INTEGRATION_ITEMS.map(({ title, description, path, Icon }) => (
					<button
						key={path}
						type="button"
						onClick={() => navigate(path)}
						style={{
							display: 'flex',
							alignItems: 'flex-start',
							gap: 14,
							padding: '16px',
							borderRadius: 16,
							border: `1px solid ${C.border}`,
							background: C.card,
							cursor: 'pointer',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						<div
							style={{
								width: 40,
								height: 40,
								borderRadius: 12,
								background: C.accentDim,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
							}}
						>
							<Icon size={20} color={C.accent} />
						</div>
						<div>
							<div
								style={{
									fontSize: 15,
									fontWeight: 700,
									color: C.text,
									marginBottom: 4,
								}}
							>
								{title}
							</div>
							<div
								style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.45 }}
							>
								{description}
							</div>
						</div>
					</button>
				))}
			</div>

			<ConnectedServicesPanel />
		</div>
	)
}
