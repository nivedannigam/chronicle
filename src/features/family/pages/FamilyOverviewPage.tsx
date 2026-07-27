import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { C, screenTitleStyle } from '@/constants/colors'
import { familyMemberPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { FamilyMemberCard } from '@/features/family/components/FamilyMemberCard'
import { InvitationsSection } from '@/features/family/components/InvitationsSection'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { listFamilyInvitations } from '@/features/family/services/family-platform.service'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'
import { HealthPageIntro } from '@/ui/figma/health/health-ui'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function FamilyOverviewPage() {
	const navigate = useNavigate()
	const { family, members, isLoading, selectedMemberId, setSelectedMemberId } =
		useFamilyContext()

	const invitationsQuery = useQuery({
		queryKey: queryKeys.family.invitations(family?.id),
		queryFn: () => listFamilyInvitations(family!.id),
		enabled: Boolean(family?.id),
		staleTime: STALE_TIME.default,
	})

	return (
		<div style={{ color: C.text, padding: '0 18px' }}>
			<div
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 10,
					background: C.bg,
					paddingTop: 4,
					paddingBottom: 14,
					marginBottom: 4,
					borderBottom: `1px solid ${C.border}`,
				}}
			>
				<button
					type="button"
					onClick={() => navigate(ROUTES.more)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 6,
						background: 'none',
						border: 'none',
						padding: '0 0 12px',
						cursor: 'pointer',
						color: C.textSec,
						fontFamily: 'inherit',
						fontSize: 14,
					}}
				>
					<ArrowLeft size={18} />
					Back
				</button>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ ...screenTitleStyle, marginBottom: 4 }}>
							{family?.name ?? 'My Family'}
						</div>
						<div style={{ fontSize: 13, color: C.textMuted }}>
							{members.length} member{members.length === 1 ? '' : 's'}
						</div>
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.familyMemberNew)}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							background: C.accentBlue,
							color: C.white,
							border: 'none',
							borderRadius: 100,
							padding: '10px 14px',
							fontSize: 12,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
							flexShrink: 0,
							minHeight: 36,
						}}
					>
						<Plus size={14} />
						Add
					</button>
				</div>
			</div>

			<div style={{ padding: '8px 0 20px' }}>
				<HealthPageIntro>
					Organize health, documents, and more around the people who matter.
				</HealthPageIntro>

				<FigmaSectionLabel>Members</FigmaSectionLabel>

				{isLoading ? (
					<ListSkeleton rows={2} height={76} />
				) : members.length === 0 ? (
					<FigmaCard
						style={{
							border: `1px dashed ${C.border}`,
							padding: '28px 20px',
							textAlign: 'center',
							marginBottom: 24,
						}}
					>
						<Users
							size={28}
							color={C.textMuted}
							style={{ margin: '0 auto 12px' }}
						/>
						<div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
							Start your family
						</div>
						<div
							style={{
								fontSize: 13,
								color: C.textMuted,
								marginBottom: 16,
								lineHeight: 1.5,
							}}
						>
							Add members to organize health, documents, and more around the
							people who matter.
						</div>
						<button
							type="button"
							onClick={() => navigate(ROUTES.familyMemberNew)}
							style={{
								background: C.accentBlue,
								color: C.white,
								border: 'none',
								borderRadius: 100,
								padding: '10px 16px',
								fontSize: 13,
								fontWeight: 700,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							Add first member
						</button>
					</FigmaCard>
				) : (
					<div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
						{members.map((member) => (
							<FamilyMemberCard
								key={member.id}
								member={member}
								selected={member.id === selectedMemberId}
								onClick={() => {
									setSelectedMemberId(member.id)
									navigate(familyMemberPath(member.id))
								}}
							/>
						))}
					</div>
				)}

				<InvitationsSection invitations={invitationsQuery.data ?? []} />
			</div>
		</div>
	)
}
