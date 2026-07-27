import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C, screenTitleStyle } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { DOCUMENT_NAV_ITEMS } from '@/features/documents/constants/documents-nav'

export function DocumentsLayout() {
	const navigate = useNavigate()

	return (
		<div style={{ color: C.text, padding: '0 18px' }}>
			<div
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 10,
					background: C.bg,
					paddingTop: 4,
					paddingBottom: 14,
					marginBottom: 4,
					borderBottom: `1px solid ${C.border}`,
				}}
			>
				<button
					type="button"
					onClick={() => navigate(ROUTES.more)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 6,
						background: 'none',
						border: 'none',
						padding: '0 0 12px',
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
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
						marginBottom: 14,
					}}
				>
					<div style={{ ...screenTitleStyle, flex: 1, minWidth: 0 }}>
						Documents
					</div>
					<FamilyMemberSwitcher />
				</div>

				<nav
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						scrollbarWidth: 'none',
						paddingBottom: 2,
					}}
					aria-label="Documents sections"
				>
					{DOCUMENT_NAV_ITEMS.map(({ label, path }) => (
						<NavLink
							key={path}
							to={path}
							end={path === ROUTES.documents}
							style={({ isActive }) => ({
								flexShrink: 0,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								minHeight: 36,
								background: isActive ? C.accentBlue : C.card,
								border: isActive ? 'none' : `1px solid ${C.border}`,
								borderRadius: 100,
								padding: '7px 16px',
								fontSize: 13,
								fontWeight: isActive ? 700 : 400,
								color: isActive ? '#fff' : C.textSec,
								textDecoration: 'none',
								fontFamily: 'inherit',
								whiteSpace: 'nowrap',
							})}
						>
							{label}
						</NavLink>
					))}
				</nav>
			</div>

			<div style={{ padding: '8px 0 20px' }}>
				<Outlet />
			</div>
		</div>
	)
}
