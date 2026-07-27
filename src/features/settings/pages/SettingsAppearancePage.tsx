import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { C } from '@/constants/colors'
import { FigmaCard } from '@/ui/figma/components/primitives'
import { SettingsPageShell } from '@/ui/figma/settings/settings-ui'

export function SettingsAppearancePage() {
	const navigate = useNavigate()

	return (
		<SettingsPageShell
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
			title="Appearance"
		>
			<FigmaCard
				style={{
					padding: '16px',
					fontSize: 14,
					color: C.textMuted,
					lineHeight: 1.55,
				}}
			>
				Chronicle currently uses a single premium dark theme. Theme selection
				and display options will be added in a future update.
			</FigmaCard>
		</SettingsPageShell>
	)
}
