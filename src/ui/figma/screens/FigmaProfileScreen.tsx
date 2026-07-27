import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	ChevronRight,
	Diamond,
	Eye,
	Heart,
	Link2,
	Settings,
	Sliders,
	User,
	Users,
	type LucideIcon,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { signOut } from '@/features/auth'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useUser } from '@/features/user/hooks/useUser'
import {
	FigmaMemberAvatar,
	memberFirstName,
	memberInitial,
} from '@/ui/figma/home/home-ui'
import { MEMBER_COLORS } from '@/ui/figma/tokens/figma-v2-tokens'
import { FC, FigmaLbl, figmaCardStyle } from '@/ui/figma/v2/atoms'

interface ProfileRow {
	icon: LucideIcon
	label: string
	subtitle: string
	path: string
	bg: string
}

interface ProfileSection {
	title: string
	rows: ProfileRow[]
}

export function FigmaProfileScreen() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()
	const { members } = useFamilyContext()
	const { allReports } = useMemberHealthReports()
	const { data: documents = [] } = useMemberDocuments()

	const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'You'
	const email = user?.email ?? ''
	const initial = memberInitial(displayName)

	const stats = useMemo(
		() => [
			{ value: String(documents.length), label: 'Docs' },
			{ value: String(allReports.length), label: 'Reports' },
			{ value: String(members.length || 1), label: 'Members' },
		],
		[allReports.length, documents.length, members.length],
	)

	const sections: ProfileSection[] = [
		{
			title: 'Profile',
			rows: [
				{
					icon: User,
					label: 'Account',
					subtitle: `${displayName}${email ? ` · ${email}` : ''}`,
					path: ROUTES.settingsAccount,
					bg: FC.blue,
				},
				{
					icon: Users,
					label: 'Family Management',
					subtitle: `${members.length} member${members.length === 1 ? '' : 's'} · roles and health sources`,
					path: ROUTES.family,
					bg: FC.purple,
				},
				{
					icon: Sliders,
					label: 'Preferences',
					subtitle: 'Family context and notification defaults',
					path: ROUTES.preferences,
					bg: FC.indigo,
				},
			],
		},
		{
			title: 'Connections',
			rows: [
				{
					icon: Link2,
					label: 'Connected Accounts',
					subtitle: 'Google Drive · sign-in providers',
					path: ROUTES.settingsConnectorsDrive,
					bg: FC.green,
				},
				{
					icon: Settings,
					label: 'Integrations',
					subtitle: 'Connectors and data sources',
					path: ROUTES.integrations,
					bg: '#64748B',
				},
			],
		},
		{
			title: 'App',
			rows: [
				{
					icon: Heart,
					label: 'Health Preferences',
					subtitle: 'Import sources, folders, scan settings',
					path: ROUTES.healthSettings,
					bg: FC.red,
				},
				{
					icon: Eye,
					label: 'Privacy & Security',
					subtitle: 'Data export and account security',
					path: ROUTES.settingsData,
					bg: FC.amber,
				},
			],
		},
		{
			title: 'Subscription',
			rows: [
				{
					icon: Diamond,
					label: 'Chronicle Family',
					subtitle: 'Family plan · manage subscription',
					path: ROUTES.settingsAccount,
					bg: FC.orange,
				},
			],
		},
	]

	return (
		<div style={{ padding: '0 22px 24px' }}>
			<div
				style={{
					padding: '8px 0 28px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 14,
				}}
			>
				<div
					style={{
						width: 86,
						height: 86,
						borderRadius: 43,
						background: `linear-gradient(135deg,${FC.blue},${FC.indigo})`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: '0 10px 32px rgba(59,130,246,0.35)',
					}}
				>
					<span style={{ color: '#fff', fontSize: 36, fontWeight: 700 }}>
						{initial}
					</span>
				</div>
				<div style={{ textAlign: 'center' }}>
					<h2
						style={{
							color: FC.fg,
							fontSize: 22,
							fontWeight: 700,
							letterSpacing: -0.8,
							marginBottom: 4,
							marginTop: 0,
						}}
					>
						{displayName}
					</h2>
					{email ? (
						<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>{email}</p>
					) : null}
				</div>

				{members.length > 0 ? (
					<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
						{members.map((member, index) => {
							const color =
								MEMBER_COLORS[index % MEMBER_COLORS.length] ?? FC.blue
							return (
								<div
									key={member.id}
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: 5,
									}}
								>
									<FigmaMemberAvatar
										initial={memberInitial(member.displayName)}
										color={color}
										size={36}
									/>
									<span
										style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}
									>
										{memberFirstName(member.displayName)}
									</span>
								</div>
							)
						})}
					</div>
				) : null}

				<div
					style={{
						display: 'flex',
						gap: 0,
						background: FC.surface,
						border: `1px solid ${FC.line}`,
						borderRadius: 18,
						overflow: 'hidden',
						width: '100%',
						maxWidth: 280,
					}}
				>
					{stats.map((stat, index) => (
						<div
							key={stat.label}
							style={{
								flex: 1,
								padding: '10px 0',
								textAlign: 'center',
								borderRight:
									index < stats.length - 1
										? '1px solid rgba(255,255,255,0.06)'
										: 'none',
							}}
						>
							<p
								style={{
									color: FC.fg,
									fontSize: 17,
									fontWeight: 700,
									letterSpacing: -0.5,
									marginBottom: 2,
									marginTop: 0,
								}}
							>
								{stat.value}
							</p>
							<p
								style={{
									color: 'rgba(255,255,255,0.3)',
									fontSize: 11,
									margin: 0,
								}}
							>
								{stat.label}
							</p>
						</div>
					))}
				</div>

				<div
					style={{
						background: 'rgba(59,130,246,0.1)',
						border: '1px solid rgba(59,130,246,0.22)',
						borderRadius: 14,
						padding: '6px 18px',
					}}
				>
					<span style={{ color: FC.blue, fontSize: 12, fontWeight: 600 }}>
						Chronicle Family Plan ✦
					</span>
				</div>
			</div>

			{sections.map((section) => (
				<div key={section.title} style={{ marginBottom: 20 }}>
					<div style={{ marginBottom: 12 }}>
						<FigmaLbl>{section.title}</FigmaLbl>
					</div>
					<div
						style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
					>
						{section.rows.map((row, index) => (
							<button
								key={row.label}
								type="button"
								onClick={() => navigate(row.path)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 13,
									padding: '13px 18px',
									borderBottom:
										index < section.rows.length - 1
											? '1px solid rgba(255,255,255,0.05)'
											: 'none',
									cursor: 'pointer',
									width: '100%',
									background: 'none',
									borderLeft: 'none',
									borderRight: 'none',
									borderTop: 'none',
									fontFamily: 'inherit',
									textAlign: 'left',
								}}
							>
								<div
									style={{
										width: 36,
										height: 36,
										borderRadius: 10,
										flexShrink: 0,
										background: row.bg,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										boxShadow: `0 2px 8px ${row.bg}40`,
									}}
								>
									<row.icon size={17} color="#fff" strokeWidth={2} />
								</div>
								<div style={{ flex: 1 }}>
									<p
										style={{
											color: FC.fg,
											fontSize: 14.5,
											fontWeight: 500,
											marginBottom: 2,
											marginTop: 0,
										}}
									>
										{row.label}
									</p>
									<p
										style={{
											color: 'rgba(255,255,255,0.35)',
											fontSize: 12,
											margin: 0,
										}}
									>
										{row.subtitle}
									</p>
								</div>
								<ChevronRight size={14} color="rgba(255,255,255,0.18)" />
							</button>
						))}
					</div>
				</div>
			))}

			<button
				type="button"
				onClick={() => void signOut()}
				style={{
					width: '100%',
					background: 'rgba(239,68,68,0.07)',
					border: '1px solid rgba(239,68,68,0.18)',
					borderRadius: 20,
					padding: '16px 20px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'pointer',
					marginBottom: 24,
					fontFamily: 'inherit',
				}}
			>
				<span style={{ color: FC.red, fontSize: 14, fontWeight: 500 }}>
					Sign Out
				</span>
			</button>
			<p
				style={{
					color: 'rgba(255,255,255,0.15)',
					fontSize: 11.5,
					textAlign: 'center',
					marginBottom: 24,
				}}
			>
				Chronicle v2.0 · Family OS
			</p>
		</div>
	)
}
