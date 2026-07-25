import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { HEALTH_NAV_ITEMS } from '@/features/health/constants/health-nav'

export function HealthLayout() {
	const navigate = useNavigate()

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.home)}
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
				Home
			</button>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 16,
				}}
			>
				<div
					style={{
						flex: 1,
						minWidth: 0,
						fontSize: 34,
						fontWeight: 800,
						letterSpacing: '-0.03em',
					}}
				>
					Health
				</div>
				<FamilyMemberSwitcher />
			</div>

			<nav
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
					gap: 8,
					marginBottom: 22,
				}}
				aria-label="Health sections"
			>
				{HEALTH_NAV_ITEMS.map(({ label, path }) => (
					<NavLink
						key={path}
						to={path}
						end={path === ROUTES.health}
						style={({ isActive }) => ({
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							minHeight: 40,
							background: isActive ? C.accent : C.card,
							border: isActive ? 'none' : `1px solid ${C.border}`,
							borderRadius: 12,
							padding: '8px 6px',
							fontSize: 11,
							fontWeight: 700,
							color: isActive ? C.white : C.textSec,
							textDecoration: 'none',
							fontFamily: 'inherit',
							textAlign: 'center',
							lineHeight: 1.2,
						})}
					>
						{label}
					</NavLink>
				))}
			</nav>

			<Outlet />
		</div>
	)
}
