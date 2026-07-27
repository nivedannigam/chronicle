import { MailPlus, Users } from 'lucide-react'
import { C } from '@/constants/colors'
import { FAMILY_ROLE_LABELS } from '@/features/family/constants/family-roles'
import type { FamilyInvitation } from '@/features/family/types/family.types'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'

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
				<FigmaSectionLabel>Invitations</FigmaSectionLabel>
				<MailPlus size={20} color={C.textMuted} />
			</div>

			<div style={{ display: 'grid', gap: 10 }}>
				{invitations.map((invitation) => (
					<FigmaCard key={invitation.id}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 12,
								padding: '14px 16px',
							}}
						>
							<div
								style={{
									width: 36,
									height: 36,
									borderRadius: 11,
									background: `${C.accentBlue}18`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								<Users size={18} color={C.accentBlue} />
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
									{invitation.email}
								</div>
								<div style={{ fontSize: 12, color: C.textMuted }}>
									{FAMILY_ROLE_LABELS[invitation.roleId]} · Pending
								</div>
							</div>
						</div>
					</FigmaCard>
				))}
			</div>
		</section>
	)
}
