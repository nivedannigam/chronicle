import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { FigmaCard } from '@/ui/figma/components/primitives'
import { MemberAvatar } from '@/features/family/components/MemberAvatar'
import { MemberRoleBadge } from '@/features/family/components/MemberRoleBadge'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'

interface FamilyMemberCardProps {
	member: FamilyMemberWithAliases
	onClick?: () => void
	selected?: boolean
}

export function FamilyMemberCard({
	member,
	onClick,
	selected = false,
}: FamilyMemberCardProps) {
	return (
		<FigmaCard
			style={{
				border: selected ? `1px solid ${C.accentBlue}` : undefined,
				background: selected ? `${C.accentBlue}10` : undefined,
			}}
		>
			<button
				type="button"
				onClick={onClick}
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					padding: '14px 16px',
					background: 'transparent',
					border: 'none',
					cursor: onClick ? 'pointer' : 'default',
					fontFamily: 'inherit',
					textAlign: 'left',
				}}
			>
				<MemberAvatar name={member.displayName} avatarUrl={member.avatarUrl} />
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 15,
							fontWeight: 700,
							color: C.text,
							marginBottom: 4,
						}}
					>
						{member.displayName}
					</div>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							flexWrap: 'wrap',
						}}
					>
						<MemberRoleBadge roleId={member.roleId} />
						<span style={{ fontSize: 12, color: C.textMuted }}>
							{member.relationship}
						</span>
						{member.status !== 'active' ? (
							<span style={{ fontSize: 12, color: C.orange }}>
								{member.status}
							</span>
						) : null}
					</div>
				</div>
				{onClick ? <ChevronRight size={18} color={C.textMuted} /> : null}
			</button>
		</FigmaCard>
	)
}
