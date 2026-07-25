import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'

const DOCUMENT_NAV_ITEMS = [
	{ label: 'Library', path: ROUTES.documents },
	{ label: 'Expiring', path: ROUTES.documentsExpiring },
] as const

export function DocumentsLayout() {
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
						fontSize: 34,
						fontWeight: 800,
						letterSpacing: '-0.03em',
					}}
				>
					Documents
				</div>
				<FamilyMemberSwitcher />
			</div>

			<nav
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
					gap: 8,
					marginBottom: 22,
				}}
				aria-label="Documents sections"
			>
				{DOCUMENT_NAV_ITEMS.map(({ label, path }) => (
					<NavLink
						key={path}
						to={path}
						end={path === ROUTES.documents}
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
