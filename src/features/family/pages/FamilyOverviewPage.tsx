import { useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { C, pagePadding } from '@/constants/colors'
import { familyMemberPath, ROUTES } from '@/constants/routes'
import { FamilyMemberCard } from '@/features/family/components/FamilyMemberCard'
import { InvitationsSection } from '@/features/family/components/InvitationsSection'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { listFamilyInvitations } from '@/features/family/services/family-platform.service'
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
		<div style={{ padding: pagePadding.home, color: C.text }}>
			<div style={{ marginBottom: 22 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 8,
					}}
				>
					Family
				</div>
				<div
					style={{
						fontSize: 32,
						fontWeight: 700,
						letterSpacing: '-0.03em',
						lineHeight: 1.1,
					}}
				>
					{family?.name ?? 'My Family'}
				</div>
				<div style={{ fontSize: 14, color: C.textMuted, marginTop: 8 }}>
					{members.length} member{members.length === 1 ? '' : 's'}
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 14,
				}}
			>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: C.textMuted,
					}}
				>
					Members
				</div>
				<button
					type="button"
					onClick={() => navigate(ROUTES.familyMemberNew)}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						background: C.accent,
						color: C.white,
						border: 'none',
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<Plus size={14} />
					Add member
				</button>
			</div>

			{isLoading ? (
				<div style={{ display: 'grid', gap: 10 }}>
					{[0, 1].map((key) => (
						<div
							key={key}
							style={{
								height: 76,
								borderRadius: 16,
								background: C.card,
								border: `1px solid ${C.border}`,
								opacity: 0.6,
							}}
						/>
					))}
				</div>
			) : members.length === 0 ? (
				<div
					style={{
						padding: '28px 20px',
						borderRadius: 18,
						border: `1px dashed ${C.border}`,
						background: C.card,
						textAlign: 'center',
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
					<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
						Add members to organize health, documents, and more around the
						people who matter.
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.familyMemberNew)}
						style={{
							background: C.accent,
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
				</div>
			) : (
				<div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
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
	)
}
