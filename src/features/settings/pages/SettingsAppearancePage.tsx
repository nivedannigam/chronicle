import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'

export function SettingsAppearancePage() {
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
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 12,
				}}
			>
				Appearance
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textMuted,
					lineHeight: 1.55,
					padding: '16px',
					borderRadius: 16,
					border: `1px solid ${C.border}`,
					background: C.card,
				}}
			>
				Chronicle currently uses a single premium dark theme. Theme selection
				and display options will be added in a future update.
			</div>
		</div>
	)
}
