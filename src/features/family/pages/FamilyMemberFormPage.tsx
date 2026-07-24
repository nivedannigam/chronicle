import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { C } from '@/constants/colors'
import { familyMemberPath, ROUTES } from '@/constants/routes'
import {
	FamilyMemberForm,
	type FamilyMemberFormValues,
} from '@/features/family/components/FamilyMemberForm'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
	createFamilyMember,
	getFamilyMemberById,
	setFamilyMemberAliases,
	updateFamilyMember,
} from '@/features/family/services/family.service'
import { invalidateFamilyQueries } from '@/lib/query-invalidation'
import { queryClient } from '@/lib/query-client'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function FamilyMemberFormPage() {
	const navigate = useNavigate()
	const { memberId } = useParams()
	const isEdit = Boolean(memberId)
	const { user } = useAuth()
	const { family, refresh } = useFamilyContext()

	const memberQuery = useQuery({
		queryKey: ['family-member-detail', memberId],
		queryFn: () => getFamilyMemberById(memberId!),
		enabled: isEdit,
		staleTime: STALE_TIME.familyMembers,
	})

	const handleSubmit = async (values: FamilyMemberFormValues) => {
		if (!user?.id || !family?.id) {
			throw new Error('You must be signed in.')
		}

		const aliases = values.aliases
			.split(',')
			.map((alias) => alias.trim())
			.filter(Boolean)

		if (isEdit && memberId) {
			await updateFamilyMember(memberId, {
				displayName: values.displayName.trim(),
				relationship: values.relationship,
				roleId: values.roleId,
				dateOfBirth: values.dateOfBirth || null,
				gender: values.gender || null,
				status: values.status,
			})
			await setFamilyMemberAliases(user.id, memberId, aliases)
			invalidateFamilyQueries(user.id)
			await refresh()
			navigate(familyMemberPath(memberId))
			return
		}

		const member = await createFamilyMember({
			userId: user.id,
			familyId: family.id,
			displayName: values.displayName.trim(),
			relationship: values.relationship,
			roleId: values.roleId,
			dateOfBirth: values.dateOfBirth || null,
			gender: values.gender || null,
			status: values.status,
			aliases,
		})

		invalidateFamilyQueries(user.id)
		await refresh()
		void queryClient.invalidateQueries({
			queryKey: queryKeys.family.context(user.id),
		})
		navigate(familyMemberPath(member.id))
	}

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<button
				type="button"
				onClick={() =>
					navigate(isEdit ? familyMemberPath(memberId!) : ROUTES.family)
				}
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
				Back
			</button>

			<div
				style={{
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 20,
				}}
			>
				{isEdit ? 'Edit member' : 'Add member'}
			</div>

			{isEdit && memberQuery.isLoading ? (
				<div
					style={{
						height: 320,
						borderRadius: 18,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.6,
					}}
				/>
			) : (
				<FamilyMemberForm
					initial={memberQuery.data ?? undefined}
					submitLabel={isEdit ? 'Save changes' : 'Add member'}
					disableOwnerRole
					onSubmit={handleSubmit}
				/>
			)}
		</div>
	)
}
