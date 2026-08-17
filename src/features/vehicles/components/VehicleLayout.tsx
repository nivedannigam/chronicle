import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Clock, Home, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { AppShell } from '@/components/layout/mobile'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { VehicleProvider } from '@/features/vehicles/context/VehicleContext'
import {
	FigmaHeaderSearchButton,
	FigmaScreenHeader,
} from '@/ui/figma/shell/FigmaScreenHeader'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'

const VEHICLE_TABS: {
	id: string
	label: string
	path: string
	Icon: LucideIcon
	color: string
	end?: boolean
}[] = [
	{
		id: 'home',
		label: 'Home',
		path: ROUTES.vehicles,
		Icon: Home,
		color: FC.orange,
		end: true,
	},
	{
		id: 'timeline',
		label: 'Timeline',
		path: ROUTES.vehiclesTimeline,
		Icon: Clock,
		color: FC.blue,
	},
	{
		id: 'settings',
		label: 'Settings',
		path: ROUTES.vehiclesSettings,
		Icon: Settings,
		color: FC.mid,
	},
]

function isTabActive(
	pathname: string,
	tabPath: string,
	end?: boolean,
): boolean {
	if (end) {
		return pathname === tabPath
	}

	return pathname.startsWith(tabPath)
}

export function VehicleLayout() {
	const navigate = useNavigate()
	const location = useLocation()

	return (
		<AppShell
			paddingX={22}
			style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
			header={
				<FigmaScreenHeader
					title="Vehicles"
					onBack={() => navigate(ROUTES.modules)}
					backLabel="Modules"
					actions={
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<FamilyMemberSwitcher />
							<FigmaHeaderSearchButton
								onClick={() => navigate(ROUTES.search)}
							/>
						</div>
					}
					paddingBottom={0}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							background: FC.surface,
							border: `1px solid ${FC.line}`,
							borderRadius: 26,
							padding: '5px 6px',
							marginTop: 18,
							marginBottom: 20,
							overflowX: 'auto',
							scrollbarWidth: 'none',
						}}
					>
						{VEHICLE_TABS.map((tab) => {
							const active = isTabActive(location.pathname, tab.path, tab.end)
							const Icon = tab.Icon

							return (
								<NavLink
									key={tab.id}
									to={tab.path}
									end={tab.end}
									style={{
										flexShrink: 0,
										display: 'flex',
										alignItems: 'center',
										gap: active ? 7 : 0,
										padding: active ? '8px 14px 8px 10px' : '8px 10px',
										background: active ? `${tab.color}18` : 'none',
										border: `1px solid ${active ? `${tab.color}35` : 'transparent'}`,
										borderRadius: 20,
										cursor: 'pointer',
										textDecoration: 'none',
										transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
										boxShadow: active ? `0 2px 12px ${tab.color}22` : 'none',
									}}
								>
									<Icon
										size={16}
										color={active ? tab.color : 'rgba(255,255,255,0.3)'}
										strokeWidth={active ? 2.2 : 1.7}
									/>
									{active ? (
										<span
											style={{
												color: tab.color,
												fontSize: 12.5,
												fontWeight: 700,
												letterSpacing: -0.2,
												whiteSpace: 'nowrap',
											}}
										>
											{tab.label}
										</span>
									) : null}
								</NavLink>
							)
						})}
					</div>
				</FigmaScreenHeader>
			}
		>
			<VehicleProvider>
				<Outlet />
			</VehicleProvider>
		</AppShell>
	)
}
