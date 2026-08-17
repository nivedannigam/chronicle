import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
	Clock,
	FileText,
	Home,
	MessageCircle,
	Receipt,
	Settings,
	Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { INSURANCE_COPY } from '@/constants/product-copy'
import { AppShell } from '@/components/layout/mobile'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { InsuranceProvider } from '@/features/insurance/context/InsuranceContext'
import {
	FigmaHeaderSearchButton,
	FigmaScreenHeader,
} from '@/ui/figma/shell/FigmaScreenHeader'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'

const INSURANCE_TABS: {
	id: string
	label: string
	path: string
	Icon: LucideIcon
	color: string
	end?: boolean
}[] = [
	{
		id: 'home',
		label: INSURANCE_COPY.homeTab,
		path: ROUTES.insurance,
		Icon: Home,
		color: FC.blue,
		end: true,
	},
	{
		id: 'protection',
		label: INSURANCE_COPY.protectionTab,
		path: ROUTES.insuranceCoverage,
		Icon: Shield,
		color: FC.teal,
	},
	{
		id: 'policies',
		label: INSURANCE_COPY.policiesTab,
		path: ROUTES.insurancePolicies,
		Icon: FileText,
		color: FC.amber,
	},
	{
		id: 'claims',
		label: INSURANCE_COPY.claimsTab,
		path: ROUTES.insuranceClaims,
		Icon: Receipt,
		color: FC.orange,
	},
	{
		id: 'timeline',
		label: INSURANCE_COPY.timelineTab,
		path: ROUTES.insuranceTimeline,
		Icon: Clock,
		color: FC.teal,
	},
	{
		id: 'ask',
		label: INSURANCE_COPY.askTab,
		path: ROUTES.insuranceAsk,
		Icon: MessageCircle,
		color: FC.blue,
	},
	{
		id: 'settings',
		label: INSURANCE_COPY.settingsTab,
		path: ROUTES.insuranceSettings,
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

export function InsuranceLayout() {
	const navigate = useNavigate()
	const location = useLocation()

	return (
		<AppShell
			paddingX={22}
			style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
			header={
				<FigmaScreenHeader
					title="Insurance"
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
						{INSURANCE_TABS.map((tab) => {
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
			<InsuranceProvider>
				<Outlet />
			</InsuranceProvider>
		</AppShell>
	)
}
