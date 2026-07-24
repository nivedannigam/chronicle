import { C } from '@/constants/colors'
import { FAMILY_ROLE_LABELS } from '@/features/family/constants/family-roles'
import type { FamilyRoleId } from '@/types/database/family-foundation.types'

const ROLE_COLORS: Record<FamilyRoleId, string> = {
	owner: C.accent,
	family_manager: C.accentBlue,
	adult: C.teal,
	child: C.orange,
	viewer: C.textMuted,
}

interface MemberRoleBadgeProps {
	roleId: FamilyRoleId
}

export function MemberRoleBadge({ roleId }: MemberRoleBadgeProps) {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				borderRadius: 100,
				padding: '4px 10px',
				fontSize: 11,
				fontWeight: 700,
				color: ROLE_COLORS[roleId],
				background: `${ROLE_COLORS[roleId]}22`,
				border: `1px solid ${ROLE_COLORS[roleId]}44`,
			}}
		>
			{FAMILY_ROLE_LABELS[roleId]}
		</span>
	)
}
