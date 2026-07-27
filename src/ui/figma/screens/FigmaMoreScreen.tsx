import { useNavigate } from 'react-router-dom'
import {
	Activity,
	Calendar,
	ChevronRight,
	DollarSign,
	FileText,
	Globe,
	Heart,
	Image,
	Mail,
	Plane,
	User,
} from 'lucide-react'
import { C } from '@/constants/colors'
import {
	getModuleById,
	getMoreComingSoonModules,
	MODULE_ROUTES,
	MODULE_REGISTRY,
} from '@/constants/modules'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { useUser } from '@/features/user/hooks/useUser'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'

const MORE_MODULE_ICONS: Record<
	string,
	{ Icon: typeof DollarSign; color: string }
> = {
	finance: { Icon: DollarSign, color: C.greenAlt },
	travel: { Icon: Plane, color: C.orange },
	documents: { Icon: FileText, color: C.accent },
	health: { Icon: Heart, color: C.teal },
	photos: { Icon: Image, color: '#E879F9' },
	calendar: { Icon: Calendar, color: C.accentBlue },
	mail: { Icon: Mail, color: C.accentBlue },
}

export function FigmaMoreScreen() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()

	const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'You'
	const email = user?.email ?? ''
	const initial = displayName.charAt(0).toUpperCase()

	const enabledModules = MODULE_REGISTRY.filter(
		(module) =>
			module.enabled &&
			!module.comingSoon &&
			['health', 'documents', 'family', 'timeline'].includes(module.id),
	)

	const comingSoon = getMoreComingSoonModules()

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<FigmaCard style={{ padding: '16px', marginBottom: 28 }}>
				<button
					type="button"
					onClick={() => navigate(ROUTES.profile)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						width: '100%',
						background: 'none',
						border: 'none',
						padding: 0,
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
					}}
				>
					<div
						style={{
							width: 52,
							height: 52,
							borderRadius: 16,
							background: C.accent,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 22,
							fontWeight: 700,
							color: '#fff',
							flexShrink: 0,
						}}
					>
						{initial}
					</div>
					<div style={{ flex: 1 }}>
						<div
							style={{
								fontSize: 17,
								fontWeight: 700,
								color: C.text,
								marginBottom: 3,
								letterSpacing: '-0.01em',
							}}
						>
							{displayName}
						</div>
						<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
							{email}
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
							<div
								style={{
									width: 7,
									height: 7,
									borderRadius: '50%',
									background: C.greenAlt,
								}}
							/>
							<span
								style={{ fontSize: 12, color: C.greenAlt, fontWeight: 600 }}
							>
								Chronicle Active
							</span>
						</div>
					</div>
					<ChevronRight size={18} color={C.textMuted} />
				</button>
			</FigmaCard>

			<FigmaSectionLabel>All Modules</FigmaSectionLabel>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr 1fr',
					gap: 10,
					marginBottom: 28,
				}}
			>
				{enabledModules.map((module) => {
					const iconMeta = MORE_MODULE_ICONS[module.id] ?? {
						Icon: Activity,
						color: module.color ?? C.accent,
					}
					const path =
						MODULE_ROUTES[module.id] ??
						(module.id === 'timeline' ? ROUTES.timeline : undefined)

					return (
						<button
							key={module.id}
							type="button"
							onClick={() => path && navigate(path)}
							disabled={!path}
							style={{
								background: C.card,
								border: `1px solid ${C.border}`,
								borderRadius: 20,
								padding: '18px 0',
								aspectRatio: '1',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								gap: 10,
								cursor: path ? 'pointer' : 'default',
								fontFamily: 'inherit',
							}}
						>
							<div
								style={{
									width: 42,
									height: 42,
									borderRadius: 14,
									background: `${iconMeta.color}18`,
									border: `1px solid ${iconMeta.color}25`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<iconMeta.Icon
									size={22}
									color={iconMeta.color}
									strokeWidth={1.7}
								/>
							</div>
							<span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>
								{module.name}
							</span>
						</button>
					)
				})}
			</div>

			{comingSoon.length > 0 ? (
				<>
					<FigmaSectionLabel>Coming Soon</FigmaSectionLabel>
					<div
						style={{
							display: 'flex',
							justifyContent: 'flex-start',
							gap: 18,
							marginBottom: 28,
							flexWrap: 'wrap',
						}}
					>
						{comingSoon.map((module) => {
							const def = getModuleById(module.id)
							const Icon = def?.icon ?? Activity

							return (
								<div
									key={module.id}
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: 8,
										opacity: 0.35,
									}}
								>
									<div
										style={{
											width: 52,
											height: 52,
											borderRadius: 16,
											background: C.card,
											border: `1px solid ${C.border}`,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
										}}
									>
										<Icon size={22} color={C.textMuted} strokeWidth={1.5} />
									</div>
									<span style={{ fontSize: 12, color: C.textMuted }}>
										{module.name}
									</span>
								</div>
							)
						})}
					</div>
				</>
			) : null}

			<FigmaSectionLabel>Settings</FigmaSectionLabel>
			<FigmaCard>
				{[
					{
						Icon: User,
						label: 'Account',
						sub: email,
						path: ROUTES.settingsAccount,
					},
					{
						Icon: Globe,
						label: 'Connected Services',
						sub: 'Google Drive & integrations',
						path: ROUTES.integrations,
					},
				].map((row, index, rows) => (
					<button
						key={row.label}
						type="button"
						onClick={() => navigate(row.path)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 14,
							padding: '14px 16px',
							borderBottom:
								index < rows.length - 1 ? `1px solid ${C.border}` : 'none',
							width: '100%',
							background: 'none',
							borderLeft: 'none',
							borderRight: 'none',
							borderTop: 'none',
							cursor: 'pointer',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						<div
							style={{
								width: 36,
								height: 36,
								borderRadius: 11,
								background: 'rgba(255,255,255,0.06)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
							}}
						>
							<row.Icon size={18} color={C.textSec} strokeWidth={1.6} />
						</div>
						<div style={{ flex: 1 }}>
							<div
								style={{
									fontSize: 15,
									fontWeight: 600,
									color: C.text,
									marginBottom: 2,
								}}
							>
								{row.label}
							</div>
							<div style={{ fontSize: 12, color: C.textMuted }}>{row.sub}</div>
						</div>
						<ChevronRight size={16} color={C.textMuted} />
					</button>
				))}
			</FigmaCard>
		</div>
	)
}
