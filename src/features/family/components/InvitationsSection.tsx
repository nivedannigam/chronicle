import { MailPlus, Users } from 'lucide-react'
import { C } from '@/constants/colors'
import { FAMILY_ROLE_LABELS } from '@/features/family/constants/family-roles'
import type { FamilyInvitation } from '@/features/family/types/family.types'

interface InvitationsSectionProps {
	invitations: FamilyInvitation[]
}

export function InvitationsSection({ invitations }: InvitationsSectionProps) {
	if (invitations.length === 0) {
		return null
	}

	return (
		<section>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
				}}
			>
				<div>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.09em',
							textTransform: 'uppercase',
							color: C.textMuted,
							marginBottom: 4,
						}}
					>
						Invitations
					</div>
					<div style={{ fontSize: 14, color: C.textSec }}>
						Pending family invitations
					</div>
				</div>
				<MailPlus size={20} color={C.textMuted} />
			</div>

			<div style={{ display: 'grid', gap: 10 }}>
				{invitations.map((invitation) => (
					<div
						key={invitation.id}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							padding: '14px 16px',
							borderRadius: 16,
							border: `1px solid ${C.border}`,
							background: C.card,
						}}
					>
						<Users size={18} color={C.accent} />
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
								{invitation.email}
							</div>
							<div style={{ fontSize: 12, color: C.textMuted }}>
								{FAMILY_ROLE_LABELS[invitation.roleId]} · Pending
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
