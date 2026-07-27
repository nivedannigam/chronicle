import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { C } from '@/constants/colors'
import { FigmaCard } from '@/ui/figma/components/primitives'
import { SettingsPageShell } from '@/ui/figma/settings/settings-ui'

export function SettingsNotificationsPage() {
	const navigate = useNavigate()

	return (
		<SettingsPageShell
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
			title="Notifications"
		>
			<FigmaCard
				style={{
					padding: '16px',
					fontSize: 14,
					color: C.textMuted,
					lineHeight: 1.55,
				}}
			>
				Notification preferences are not available yet. Import completion alerts
				appear in Health today. Full notification controls will ship in a future
				update.
			</FigmaCard>
		</SettingsPageShell>
	)
}
