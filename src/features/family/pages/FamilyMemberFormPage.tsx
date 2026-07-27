import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { familyMemberPath, ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
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
import { FigmaCard } from '@/ui/figma/components/primitives'
import { SettingsPageShell } from '@/ui/figma/settings/settings-ui'

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
		<SettingsPageShell
			backLabel={isEdit ? 'Member' : 'Family'}
			onBack={() =>
				navigate(isEdit ? familyMemberPath(memberId!) : ROUTES.family)
			}
			title={isEdit ? 'Edit member' : 'Add member'}
			subtitle={
				isEdit
					? 'Update profile details and health aliases.'
					: 'Add someone to your family workspace.'
			}
		>
			{isEdit && memberQuery.isLoading ? (
				<ListSkeleton rows={4} height={72} />
			) : (
				<FigmaCard style={{ padding: '16px' }}>
					<FamilyMemberForm
						initial={memberQuery.data ?? undefined}
						submitLabel={isEdit ? 'Save changes' : 'Add member'}
						disableOwnerRole
						onSubmit={handleSubmit}
					/>
				</FigmaCard>
			)}
		</SettingsPageShell>
	)
}
