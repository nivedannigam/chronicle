import { useMutation, useQuery } from '@tanstack/react-query'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import {
	createFamilyMember,
	ensureDefaultFamilyMember,
	listFamilyMembersWithAliases,
} from '@/features/family/services/family.service'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import type { FamilyRoleId } from '@/types/database/family-foundation.types'
import { invalidateFamilyQueries } from '@/lib/query-invalidation'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

async function fetchFamilyMembers(userId: string, profileName: string) {
	const rows = await ensureDefaultFamilyMember({
		userId,
		displayName: 'Me',
		profileName,
	})

	return dedupeFamilyMembers(rows)
}

export function useFamilyMembers(
	userId: string | undefined,
	profileName = 'Me',
) {
	const { family } = useFamilyContext()

	const query = useQuery({
		queryKey: queryKeys.family.members(userId),
		queryFn: () => fetchFamilyMembers(userId!, profileName),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.familyMembers,
	})

	const addMemberMutation = useMutation({
		mutationFn: async (input: {
			displayName: string
			relationship: string
			roleId?: FamilyRoleId
			aliases?: string[]
		}) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			if (!family?.id) {
				throw new Error('Family is not ready yet.')
			}

			await createFamilyMember({
				userId,
				familyId: family.id,
				displayName: input.displayName,
				relationship: input.relationship,
				roleId: input.roleId,
				aliases: input.aliases ?? [],
			})
		},
		onSuccess: () => {
			invalidateFamilyQueries(userId)
		},
	})

	return {
		members: query.data ?? [],
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error instanceof Error ? query.error.message : null,
		refresh: () => query.refetch(),
		addMember: async (
			displayName: string,
			relationship: string,
			aliases: string[] = [],
		) => {
			await addMemberMutation.mutateAsync({
				displayName,
				relationship,
				aliases,
			})
		},
	}
}

export async function loadFamilyMembers(userId: string) {
	return listFamilyMembersWithAliases(userId)
}
