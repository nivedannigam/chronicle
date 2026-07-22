import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'

const NAV_ITEMS = [
	{ label: 'Dashboard', path: ROUTES.health },
	{ label: 'Reports', path: ROUTES.healthReports },
	{ label: 'Trends', path: ROUTES.healthTrends },
] as const

export function HealthLayout() {
	const navigate = useNavigate()

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.more)}
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
					marginBottom: 16,
				}}
			>
				Health
			</div>

			<div
				style={{
					display: 'flex',
					gap: 8,
					marginBottom: 22,
					overflowX: 'auto',
					scrollbarWidth: 'none',
				}}
			>
				{NAV_ITEMS.map(({ label, path }) => (
					<NavLink
						key={path}
						to={path}
						end={path === ROUTES.health}
						style={({ isActive }) => ({
							flexShrink: 0,
							background: isActive ? C.accent : C.card,
							border: isActive ? 'none' : `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 16px',
							fontSize: 13,
							fontWeight: 700,
							color: isActive ? C.white : C.textSec,
							textDecoration: 'none',
							fontFamily: 'inherit',
						})}
					>
						{label}
					</NavLink>
				))}
			</div>

			<Outlet />
		</div>
	)
}
