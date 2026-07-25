import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberCard } from '@/features/family/components/FamilyMemberCard'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import type {
	CommunicationStyle,
	DisplayFormat,
} from '@/features/personalization/types/personal-context.types'

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
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.profile)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 18,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Profile
			</button>

			<div
				style={{
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Preferences
			</div>
			<div style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>
				Chronicle adapts answers to your selected family member and explanation
				style. Preferences are saved to your account.
			</div>

			<div
				style={{
					padding: '14px 16px',
					borderRadius: 14,
					background: C.card,
					border: `1px solid ${C.border}`,
					marginBottom: 20,
				}}
			>
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
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Selected member
			</div>

			<div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
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
									right: 14,
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

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				AI explanation style
			</div>

			<div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
				{STYLE_OPTIONS.map((option) => (
					<button
						key={option.id}
						type="button"
						onClick={() => void handleStyleChange(option.id)}
						style={{
							textAlign: 'left',
							padding: '12px 14px',
							borderRadius: 14,
							border: `1px solid ${
								preferences.communicationStyle === option.id
									? C.accentBlue
									: C.border
							}`,
							background:
								preferences.communicationStyle === option.id
									? C.accentBlueDim
									: C.card,
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

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Display format
			</div>

			<div style={{ display: 'flex', gap: 8 }}>
				{(['summary', 'detailed'] as DisplayFormat[]).map((format) => (
					<button
						key={format}
						type="button"
						onClick={() => void handleDisplayFormatChange(format)}
						style={{
							flex: 1,
							padding: '10px 12px',
							borderRadius: 12,
							border: `1px solid ${
								preferences.displayFormat === format ? C.accentBlue : C.border
							}`,
							background:
								preferences.displayFormat === format
									? C.accentBlueDim
									: C.card2,
							color: C.textSec,
							fontFamily: 'inherit',
							fontSize: 13,
							fontWeight: 600,
							cursor: 'pointer',
							textTransform: 'capitalize',
						}}
					>
						{format}
					</button>
				))}
			</div>
		</div>
	)
}
