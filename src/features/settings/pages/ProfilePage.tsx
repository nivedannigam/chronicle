import { useNavigate } from 'react-router-dom'
import {
	Bell,
	ChevronRight,
	Code2,
	Heart,
	Link2,
	LogOut,
	Palette,
	Plug,
	Shield,
	SlidersHorizontal,
	User,
	Users,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { signOut } from '@/features/auth'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUser } from '@/features/user/hooks/useUser'

interface MenuItem {
	icon: typeof User
	label: string
	hint?: string
	path?: string
	destructive?: boolean
	onClick?: () => void
}

export function ProfilePage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()

	const accountItems: MenuItem[] = [
		{
			icon: User,
			label: 'Account',
			hint: 'Name, email, and security',
			path: ROUTES.settingsAccount,
		},
		{
			icon: Users,
			label: 'Family Management',
			hint: 'Members, roles, and health sources',
			path: ROUTES.family,
		},
		{
			icon: SlidersHorizontal,
			label: 'Preferences',
			hint: 'Family context and defaults',
			path: ROUTES.preferences,
		},
	]

	const connectionItems: MenuItem[] = [
		{
			icon: Link2,
			label: 'Connected Accounts',
			hint: 'Google Drive and sign-in providers',
			path: ROUTES.settingsConnectorsDrive,
		},
		{
			icon: Plug,
			label: 'Integrations',
			hint: 'Connectors and data sources',
			path: ROUTES.integrations,
		},
	]

	const appItems: MenuItem[] = [
		{
			icon: Heart,
			label: 'Health Preferences',
			hint: 'Import sources, folders, and scan settings',
			path: ROUTES.healthSettings,
		},
		{
			icon: Bell,
			label: 'Notifications',
			hint: 'Import alerts and reminders',
			path: ROUTES.settingsNotifications,
		},
		{
			icon: Palette,
			label: 'Appearance',
			hint: 'Theme and display',
			path: ROUTES.settingsAppearance,
		},
		{
			icon: Shield,
			label: 'Privacy & Data',
			hint: 'Export and reset health data',
			path: ROUTES.settingsData,
		},
	]

	const developerItems: MenuItem[] = import.meta.env.DEV
		? [
				{
					icon: Code2,
					label: 'Developer Options',
					hint: 'Debug tools and import utilities',
					path: ROUTES.healthSettings,
				},
			]
		: []

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					textAlign: 'center',
					marginBottom: 28,
					paddingTop: 8,
				}}
			>
				<UserAvatar
					name={profile?.name}
					imageUrl={profile?.avatarUrl}
					size={80}
				/>
				<div
					style={{
						fontSize: 22,
						fontWeight: 800,
						letterSpacing: '-0.03em',
						marginTop: 14,
					}}
				>
					{profile?.name ?? 'Your Profile'}
				</div>
				{user?.email ? (
					<div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
						{user.email}
					</div>
				) : null}
			</div>

			<SectionLabel>Profile</SectionLabel>
			<MenuGroup items={accountItems} onNavigate={navigate} />

			<SectionLabel>Connections</SectionLabel>
			<MenuGroup items={connectionItems} onNavigate={navigate} />

			<SectionLabel>App</SectionLabel>
			<MenuGroup items={appItems} onNavigate={navigate} />

			{developerItems.length > 0 ? (
				<>
					<SectionLabel>Developer</SectionLabel>
					<MenuGroup items={developerItems} onNavigate={navigate} />
				</>
			) : null}

			<button
				type="button"
				onClick={() => void signOut()}
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 8,
					padding: '14px 16px',
					marginTop: 8,
					borderRadius: 16,
					border: `1px solid rgba(255,69,58,0.25)`,
					background: 'rgba(255,69,58,0.08)',
					color: C.red,
					fontSize: 15,
					fontWeight: 700,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				<LogOut size={18} />
				Logout
			</button>
		</div>
	)
}

function SectionLabel({ children }: { children: string }) {
	return (
		<div
			style={{
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: '0.09em',
				textTransform: 'uppercase',
				color: C.textMuted,
				marginBottom: 10,
				marginTop: 4,
			}}
		>
			{children}
		</div>
	)
}

function MenuGroup({
	items,
	onNavigate,
}: {
	items: MenuItem[]
	onNavigate: (path: string) => void
}) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 16,
				overflow: 'hidden',
				marginBottom: 14,
			}}
		>
			{items.map((item, index) => (
				<MenuRow
					key={item.label}
					item={item}
					isLast={index === items.length - 1}
					onNavigate={onNavigate}
				/>
			))}
		</div>
	)
}

function MenuRow({
	item,
	isLast,
	onNavigate,
}: {
	item: MenuItem
	isLast: boolean
	onNavigate: (path: string) => void
}) {
	const { icon: Icon, label, hint, path, destructive = false, onClick } = item

	return (
		<button
			type="button"
			onClick={() => {
				if (onClick) {
					onClick()
					return
				}

				if (path) {
					onNavigate(path)
				}
			}}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				width: '100%',
				padding: '14px 16px',
				background: 'transparent',
				border: 'none',
				borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<Icon size={18} color={destructive ? C.red : C.textSec} />
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 15,
						fontWeight: 600,
						color: destructive ? C.red : C.text,
					}}
				>
					{label}
				</div>
				{hint ? (
					<div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
						{hint}
					</div>
				) : null}
			</div>
			<ChevronRight size={16} color={C.textMuted} />
		</button>
	)
}
