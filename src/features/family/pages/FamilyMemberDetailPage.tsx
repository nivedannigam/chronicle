import { useNavigate, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { C } from '@/constants/colors'
import { familyMemberEditPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { FUTURE_MODULE_PLACEHOLDERS } from '@/features/family/constants/family-roles'
import { MemberAvatar } from '@/features/family/components/MemberAvatar'
import { MemberRoleBadge } from '@/features/family/components/MemberRoleBadge'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { getFamilyMemberById } from '@/features/family/services/family.service'
import { formatDateOfBirth } from '@/features/family/utils/member-display'
import { STALE_TIME } from '@/lib/query-keys'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'
import {
	HealthMetaGrid,
	HealthScreen,
	HealthSubpageHeader,
} from '@/ui/figma/health/health-ui'
import { healthPrimaryButtonStyle } from '@/ui/figma/health/health-ui.styles'

export function FamilyMemberDetailPage() {
	const navigate = useNavigate()
	const { memberId = '' } = useParams()
	const { setSelectedMemberId } = useFamilyContext()

	const memberQuery = useQuery({
		queryKey: ['family-member-detail', memberId],
		queryFn: () => getFamilyMemberById(memberId),
		enabled: Boolean(memberId),
		staleTime: STALE_TIME.familyMembers,
	})

	const member = memberQuery.data

	if (memberQuery.isLoading) {
		return (
			<HealthScreen>
				<ListSkeleton rows={3} height={120} />
			</HealthScreen>
		)
	}

	if (!member) {
		return (
			<HealthScreen>
				<FigmaCard style={{ padding: '24px 16px', textAlign: 'center' }}>
					<p style={{ margin: '0 0 12px', color: C.textMuted }}>
						Member not found.
					</p>
					<button
						type="button"
						onClick={() => navigate(ROUTES.profileFamily)}
						style={{
							...healthPrimaryButtonStyle,
							margin: '0 auto',
						}}
					>
						Back to family
					</button>
				</FigmaCard>
			</HealthScreen>
		)
	}

	return (
		<HealthScreen padding="0 18px 20px">
			<HealthSubpageHeader
				backLabel="Family"
				onBack={() => navigate(ROUTES.profileFamily)}
				title={member.displayName}
				subtitle={member.relationship}
				badge={
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<MemberRoleBadge roleId={member.roleId} />
						<button
							type="button"
							onClick={() => navigate(familyMemberEditPath(member.id))}
							style={{
								width: 40,
								height: 40,
								borderRadius: '50%',
								border: `1px solid ${C.border}`,
								background: C.card,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								cursor: 'pointer',
							}}
						>
							<Pencil size={16} color={C.textSec} />
						</button>
					</div>
				}
			/>

			<div
				style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}
			>
				<MemberAvatar
					name={member.displayName}
					avatarUrl={member.avatarUrl}
					size={72}
				/>
			</div>

			<HealthMetaGrid
				rows={[
					{
						label: 'Date of birth',
						value: formatDateOfBirth(member.dateOfBirth) ?? '—',
					},
					{
						label: 'Gender',
						value: member.gender?.replaceAll('_', ' ') ?? '—',
					},
					{ label: 'Status', value: member.status },
					{
						label: 'Health aliases',
						value: member.aliases.length > 0 ? member.aliases.join(', ') : '—',
					},
				]}
			/>

			<FigmaSectionLabel>Modules</FigmaSectionLabel>
			<div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
				{FUTURE_MODULE_PLACEHOLDERS.map((module) => (
					<FigmaCard key={module.id}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '14px 16px',
							}}
						>
							<span style={{ fontSize: 14, fontWeight: 600 }}>
								{module.label}
							</span>
							<span style={{ fontSize: 12, color: C.textMuted }}>
								{module.available ? 'Available' : 'Coming soon'}
							</span>
						</div>
					</FigmaCard>
				))}
			</div>

			<button
				type="button"
				onClick={() => setSelectedMemberId(member.id)}
				style={{
					...healthPrimaryButtonStyle,
					width: '100%',
					justifyContent: 'center',
					padding: '12px 16px',
					fontSize: 14,
				}}
			>
				Use as selected member
			</button>
		</HealthScreen>
	)
}
