import { useNavigate } from 'react-router-dom'
import {
	Bell,
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
import { FigmaCard } from '@/ui/figma/components/primitives'
import { HealthScreen } from '@/ui/figma/health/health-ui'
import {
	SettingsDestructiveButton,
	SettingsMenuGroup,
	type SettingsMenuItem,
} from '@/ui/figma/settings/settings-ui'
import { SettingsSectionLabel } from '@/ui/figma/settings/settings-section-label'

export function ProfilePage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()

	const accountItems: SettingsMenuItem[] = [
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

	const connectionItems: SettingsMenuItem[] = [
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

	const appItems: SettingsMenuItem[] = [
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

	const developerItems: SettingsMenuItem[] = import.meta.env.DEV
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
		<HealthScreen padding="0 18px 20px">
			<FigmaCard
				style={{
					padding: '20px 16px',
					marginBottom: 24,
					marginTop: 8,
					textAlign: 'center',
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
			</FigmaCard>

			<SettingsSectionLabel>Profile</SettingsSectionLabel>
			<SettingsMenuGroup items={accountItems} onNavigate={navigate} />

			<SettingsSectionLabel>Connections</SettingsSectionLabel>
			<SettingsMenuGroup items={connectionItems} onNavigate={navigate} />

			<SettingsSectionLabel>App</SettingsSectionLabel>
			<SettingsMenuGroup items={appItems} onNavigate={navigate} />

			{developerItems.length > 0 ? (
				<>
					<SettingsSectionLabel>Developer</SettingsSectionLabel>
					<SettingsMenuGroup items={developerItems} onNavigate={navigate} />
				</>
			) : null}

			<SettingsDestructiveButton onClick={() => void signOut()}>
				<LogOut size={18} />
				Logout
			</SettingsDestructiveButton>
		</HealthScreen>
	)
}
