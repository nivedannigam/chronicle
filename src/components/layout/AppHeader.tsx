import { useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { useUser } from '@/features/user/hooks/useUser'

export function AppHeader() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()
	const initials = (profile?.name ?? user?.email ?? 'U')
		.slice(0, 1)
		.toUpperCase()

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '10px 18px 8px',
				flexShrink: 0,
			}}
		>
			<div
				style={{
					fontSize: 15,
					fontWeight: 700,
					color: C.text,
					letterSpacing: '-0.02em',
				}}
			>
				Chronicle
			</div>

			<button
				type="button"
				onClick={() => navigate(ROUTES.profile)}
				aria-label="Open profile"
				style={{
					width: 36,
					height: 36,
					borderRadius: '50%',
					border: `1px solid ${C.border}`,
					background: C.card2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				{profile?.name ? (
					<span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
						{initials}
					</span>
				) : (
					<User size={18} color={C.textSec} />
				)}
			</button>
		</div>
	)
}
