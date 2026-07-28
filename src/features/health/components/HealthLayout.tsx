import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
	BarChart2,
	GitCommitHorizontal,
	LayoutGrid,
	Lightbulb,
	ScrollText,
	Search,
	SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUser } from '@/features/user/hooks/useUser'
import { memberInitial } from '@/ui/figma/home/home-ui'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'

const HEALTH_TABS: {
	id: string
	label: string
	path: string
	Icon: LucideIcon
	color: string
	end?: boolean
}[] = [
	{
		id: 'overview',
		label: 'Overview',
		path: ROUTES.health,
		Icon: LayoutGrid,
		color: FC.green,
		end: true,
	},
	{
		id: 'reports',
		label: 'Reports',
		path: ROUTES.healthReports,
		Icon: ScrollText,
		color: FC.blue,
	},
	{
		id: 'timeline',
		label: 'Timeline',
		path: ROUTES.healthTimeline,
		Icon: GitCommitHorizontal,
		color: FC.purple,
	},
	{
		id: 'metrics',
		label: 'Metrics',
		path: ROUTES.healthMetrics,
		Icon: BarChart2,
		color: FC.amber,
	},
	{
		id: 'insights',
		label: 'Insights',
		path: ROUTES.healthInsights,
		Icon: Lightbulb,
		color: FC.teal,
	},
	{
		id: 'setup',
		label: 'Setup',
		path: ROUTES.healthSettings,
		Icon: SlidersHorizontal,
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

export function HealthLayout() {
	const navigate = useNavigate()
	const location = useLocation()
	const { user } = useAuth()
	const { profile } = useUser()
	const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'You'
	const initial = memberInitial(displayName)

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				minHeight: 0,
				flex: 1,
			}}
		>
			<div style={{ padding: '0 22px 0', flexShrink: 0 }}>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: 18,
					}}
				>
					<h1
						style={{
							color: FC.fg,
							fontSize: 34,
							fontWeight: 700,
							letterSpacing: -1.6,
							margin: 0,
						}}
					>
						Health
					</h1>
					<div style={{ display: 'flex', gap: 10 }}>
						<button
							type="button"
							onClick={() => navigate(ROUTES.search)}
							aria-label="Search"
							style={{
								width: 36,
								height: 36,
								borderRadius: 12,
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<Search size={20} color={FC.dim} strokeWidth={1.8} />
						</button>
						<button
							type="button"
							onClick={() => navigate(ROUTES.profile)}
							aria-label="Profile"
							style={{
								width: 34,
								height: 34,
								borderRadius: 17,
								background: `linear-gradient(135deg,${FC.blue},${FC.indigo})`,
								border: 'none',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
								{initial}
							</span>
						</button>
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 6,
						background: FC.surface,
						border: `1px solid ${FC.line}`,
						borderRadius: 26,
						padding: '5px 6px',
						marginBottom: 20,
						overflowX: 'auto',
						scrollbarWidth: 'none',
					}}
				>
					{HEALTH_TABS.map((tab) => {
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
			</div>

			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '0 22px 20px',
					scrollbarWidth: 'none',
				}}
			>
				<Outlet />
			</div>
		</div>
	)
}
