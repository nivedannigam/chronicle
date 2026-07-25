import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { C } from '@/constants/colors'
import { MemberAvatar } from '@/features/family/components/MemberAvatar'
import { useFamilyContext } from '@/features/family/context/FamilyContext'

export function FamilyMemberSwitcher() {
	const { members, selectedMember, setSelectedMemberId } = useFamilyContext()
	const [open, setOpen] = useState(false)

	const activeMembers = useMemo(
		() => members.filter((member) => member.status === 'active'),
		[members],
	)

	if (activeMembers.length <= 1) {
		return selectedMember ? (
			<div
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 8,
					padding: '6px 12px 6px 6px',
					borderRadius: 100,
					background: C.card,
					border: `1px solid ${C.border}`,
				}}
			>
				<MemberAvatar
					name={selectedMember.displayName}
					avatarUrl={selectedMember.avatarUrl}
					size={28}
				/>
				<span
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: C.text,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						maxWidth: 140,
					}}
				>
					{selectedMember.displayName}
				</span>
			</div>
		) : null
	}

	return (
		<div style={{ position: 'relative' }}>
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 8,
					padding: '6px 12px 6px 6px',
					borderRadius: 100,
					background: C.card,
					border: `1px solid ${C.border}`,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				{selectedMember ? (
					<MemberAvatar
						name={selectedMember.displayName}
						avatarUrl={selectedMember.avatarUrl}
						size={28}
					/>
				) : null}
				<span
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: C.text,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						maxWidth: 140,
					}}
				>
					{selectedMember?.displayName ?? 'Select member'}
				</span>
				<ChevronDown size={16} color={C.textMuted} />
			</button>

			{open ? (
				<div
					style={{
						position: 'absolute',
						top: 'calc(100% + 8px)',
						right: 0,
						minWidth: 220,
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 14,
						padding: 6,
						zIndex: 20,
						boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
					}}
				>
					{activeMembers.map((member) => (
						<button
							key={member.id}
							type="button"
							onClick={() => {
								setSelectedMemberId(member.id)
								setOpen(false)
							}}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								padding: '10px 12px',
								border: 'none',
								borderRadius: 10,
								background:
									selectedMember?.id === member.id
										? C.accentDim
										: 'transparent',
								cursor: 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
							}}
						>
							<MemberAvatar
								name={member.displayName}
								avatarUrl={member.avatarUrl}
								size={32}
							/>
							<span
								style={{
									fontSize: 14,
									fontWeight: 600,
									color: C.text,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
									flex: 1,
									minWidth: 0,
								}}
							>
								{member.displayName}
							</span>
						</button>
					))}
				</div>
			) : null}
		</div>
	)
}
