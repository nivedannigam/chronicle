import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberCard } from '@/features/family/components/FamilyMemberCard'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import type {
	CommunicationStyle,
	DisplayFormat,
} from '@/features/personalization/types/personal-context.types'
import { FigmaCard } from '@/ui/figma/components/primitives'
import { HealthFilterChip } from '@/ui/figma/health/health-ui'
import {
	SettingsIntro,
	SettingsPageShell,
} from '@/ui/figma/settings/settings-ui'
import { SettingsSectionLabel } from '@/ui/figma/settings/settings-section-label'

const STYLE_OPTIONS: Array<{
	id: CommunicationStyle
	label: string
	detail: string
}> = [
	{
		id: 'simple',
		label: 'Simple',
		detail: 'Short summaries with plain language',
	},
	{
		id: 'detailed',
		label: 'Detailed',
		detail: 'Full explanations with trends and evidence',
	},
	{
		id: 'clinical',
		label: 'Clinical',
		detail: 'Precise medical terminology and reference ranges',
	},
]

export function PreferencesPage() {
	const navigate = useNavigate()
	const { members, selectedMemberId, setSelectedMemberId, family } =
		useFamilyContext()
	const { preferences, updatePreferences } = usePersonalPreferences()
	const [savedMemberId, setSavedMemberId] = useState<string | null>(null)
	const [savedStyle, setSavedStyle] = useState(false)

	const handleSelect = (memberId: string) => {
		setSelectedMemberId(memberId)
		setSavedMemberId(memberId)
		window.setTimeout(() => setSavedMemberId(null), 2000)
	}

	const handleStyleChange = async (style: CommunicationStyle) => {
		await updatePreferences({ communicationStyle: style })
		setSavedStyle(true)
		window.setTimeout(() => setSavedStyle(false), 2000)
	}

	const handleDisplayFormatChange = async (displayFormat: DisplayFormat) => {
		await updatePreferences({ displayFormat })
	}

	return (
		<SettingsPageShell
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
			title="Preferences"
		>
			<SettingsIntro>
				Chronicle adapts answers to your selected family member and explanation
				style. Preferences are saved to your account.
			</SettingsIntro>

			<FigmaCard style={{ padding: '14px 16px', marginBottom: 20 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						color: C.textMuted,
						marginBottom: 4,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
					}}
				>
					Current family
				</div>
				<div style={{ fontSize: 16, fontWeight: 700 }}>
					{family?.name ?? 'My Family'}
				</div>
			</FigmaCard>

			<SettingsSectionLabel>Selected member</SettingsSectionLabel>
			<div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
				{members.map((member) => (
					<div key={member.id} style={{ position: 'relative' }}>
						<FamilyMemberCard
							member={member}
							selected={member.id === selectedMemberId}
							onClick={() => handleSelect(member.id)}
						/>
						{savedMemberId === member.id ? (
							<div
								style={{
									position: 'absolute',
									top: 14,
									right: 44,
									display: 'flex',
									alignItems: 'center',
									gap: 4,
									fontSize: 11,
									fontWeight: 700,
									color: C.greenAlt,
								}}
							>
								<Check size={14} />
								Saved
							</div>
						) : null}
					</div>
				))}
			</div>

			<SettingsSectionLabel>AI explanation style</SettingsSectionLabel>
			<div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
				{STYLE_OPTIONS.map((option) => (
					<FigmaCard
						key={option.id}
						style={{
							border:
								preferences.communicationStyle === option.id
									? `1px solid ${C.accentBlue}`
									: undefined,
							background:
								preferences.communicationStyle === option.id
									? `${C.accentBlue}10`
									: undefined,
						}}
					>
						<button
							type="button"
							onClick={() => void handleStyleChange(option.id)}
							style={{
								width: '100%',
								textAlign: 'left',
								padding: '12px 14px',
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
								{option.label}
							</div>
							<div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
								{option.detail}
							</div>
						</button>
					</FigmaCard>
				))}
			</div>

			{savedStyle ? (
				<div
					style={{
						fontSize: 12,
						fontWeight: 700,
						color: C.greenAlt,
						marginBottom: 16,
					}}
				>
					Explanation style saved
				</div>
			) : null}

			<SettingsSectionLabel>Display format</SettingsSectionLabel>
			<div
				style={{
					display: 'flex',
					gap: 8,
					flexWrap: 'wrap',
				}}
			>
				{(['summary', 'detailed'] as DisplayFormat[]).map((format) => (
					<HealthFilterChip
						key={format}
						label={format}
						active={preferences.displayFormat === format}
						onClick={() => void handleDisplayFormatChange(format)}
					/>
				))}
			</div>
		</SettingsPageShell>
	)
}
