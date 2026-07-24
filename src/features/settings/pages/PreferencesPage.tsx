import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { FamilyMemberCard } from '@/features/family/components/FamilyMemberCard'
import { useFamilyContext } from '@/features/family/context/FamilyContext'

export function PreferencesPage() {
	const navigate = useNavigate()
	const { members, selectedMemberId, setSelectedMemberId, family } =
		useFamilyContext()
	const [savedMemberId, setSavedMemberId] = useState<string | null>(null)

	const handleSelect = (memberId: string) => {
		setSelectedMemberId(memberId)
		setSavedMemberId(memberId)
		window.setTimeout(() => setSavedMemberId(null), 2000)
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
				Choose which family member Chronicle uses across modules. Your selection
				is saved automatically.
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

			<div style={{ display: 'grid', gap: 10 }}>
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
		</div>
	)
}
