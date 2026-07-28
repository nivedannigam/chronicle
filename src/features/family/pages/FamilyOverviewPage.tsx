import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { familyMemberPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { FamilyMemberCard } from '@/features/family/components/FamilyMemberCard'
import { InvitationsSection } from '@/features/family/components/InvitationsSection'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { listFamilyInvitations } from '@/features/family/services/family-platform.service'
import {
	ProfilePageShell,
	ProfileSearchField,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function FamilyOverviewPage() {
	const navigate = useNavigate()
	const [search, setSearch] = useState('')
	const { family, members, isLoading, selectedMemberId, setSelectedMemberId } =
		useFamilyContext()

	const invitationsQuery = useQuery({
		queryKey: queryKeys.family.invitations(family?.id),
		queryFn: () => listFamilyInvitations(family!.id),
		enabled: Boolean(family?.id),
		staleTime: STALE_TIME.default,
	})

	const filteredMembers = useMemo(() => {
		const query = search.trim().toLowerCase()
		if (!query) return members

		return members.filter((member) => {
			const haystack = [
				member.displayName,
				member.relationship,
				member.roleId,
				...(member.aliases ?? []),
			]
				.join(' ')
				.toLowerCase()

			return haystack.includes(query)
		})
	}, [members, search])

	return (
		<ProfilePageShell
			title={family?.name ?? 'Family'}
			subtitle={`${members.length} member${members.length === 1 ? '' : 's'} · permissions & sharing`}
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
		>
			<div style={{ marginBottom: 16 }}>
				<ProfileSearchField
					value={search}
					onChange={setSearch}
					placeholder="Search family members"
				/>
			</div>

			<div
				style={{
					display: 'flex',
					justifyContent: 'flex-end',
					marginBottom: 16,
				}}
			>
				<button
					type="button"
					onClick={() => navigate(ROUTES.familyMemberNew)}
					aria-label="Add family member"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 6,
						background: FC.blue,
						color: '#fff',
						border: 'none',
						borderRadius: 100,
						padding: '0 18px',
						height: 44,
						fontSize: 13,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<Plus size={16} />
					Add member
				</button>
			</div>

			<ProfileSectionCard title="Members">
				{isLoading ? (
					<div style={{ padding: 16 }}>
						<ListSkeleton rows={2} height={76} />
					</div>
				) : members.length === 0 ? (
					<div
						style={{
							border: `1px dashed ${FC.line}`,
							margin: 16,
							padding: '28px 20px',
							textAlign: 'center',
							borderRadius: 18,
						}}
					>
						<Users size={28} color={FC.dim} style={{ margin: '0 auto 12px' }} />
						<div
							style={{
								fontSize: 16,
								fontWeight: 700,
								color: FC.fg,
								marginBottom: 6,
							}}
						>
							Start your family
						</div>
						<div
							style={{
								fontSize: 13,
								color: FC.mid,
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
								background: FC.blue,
								color: '#fff',
								border: 'none',
								borderRadius: 100,
								padding: '10px 16px',
								fontSize: 13,
								fontWeight: 700,
								cursor: 'pointer',
								fontFamily: 'inherit',
								minHeight: 44,
							}}
						>
							Add first member
						</button>
					</div>
				) : filteredMembers.length === 0 ? (
					<div style={{ padding: '20px 18px', color: FC.mid, fontSize: 14 }}>
						No members match &ldquo;{search.trim()}&rdquo;
					</div>
				) : (
					<div style={{ display: 'grid', gap: 0 }}>
						{filteredMembers.map((member, index) => (
							<div
								key={member.id}
								style={{
									padding: '4px 12px',
									borderBottom:
										index === filteredMembers.length - 1
											? 'none'
											: `1px solid ${FC.line}`,
								}}
							>
								<FamilyMemberCard
									member={member}
									selected={member.id === selectedMemberId}
									onClick={() => {
										setSelectedMemberId(member.id)
										navigate(familyMemberPath(member.id))
									}}
								/>
							</div>
						))}
					</div>
				)}
			</ProfileSectionCard>

			<InvitationsSection invitations={invitationsQuery.data ?? []} />
		</ProfilePageShell>
	)
}
