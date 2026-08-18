import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	assignIdentitySourceFolder,
	clearIdentitySourceAssignments,
	listIdentitySourceAssignments,
} from '@/features/identity/services/identity-sources.service'
import { STALE_TIME } from '@/lib/query-keys'

const identitySourcesKey = (userId: string | undefined) =>
	['identity', 'sources', userId] as const

export function useIdentitySources(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: identitySourcesKey(userId),
		queryFn: () => listIdentitySourceAssignments(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.vehicleSources,
	})

	const assignMutation = useMutation({
		mutationFn: assignIdentitySourceFolder,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: identitySourcesKey(userId),
			})
		},
	})

	const clearMutation = useMutation({
		mutationFn: () => clearIdentitySourceAssignments(userId!),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: identitySourcesKey(userId),
			})
		},
	})

	const assignFolder = useCallback(
		async (
			input: Omit<Parameters<typeof assignIdentitySourceFolder>[0], 'userId'>,
		) => {
			if (!userId) {
				throw new Error('Sign in to connect a folder.')
			}

			return assignMutation.mutateAsync({ ...input, userId })
		},
		[assignMutation, userId],
	)

	const clearAll = useCallback(async () => {
		if (!userId) {
			return
		}

		await clearMutation.mutateAsync()
	}, [clearMutation, userId])

	return {
		assignments: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
		refresh: query.refetch,
		assignFolder,
		hasFolderAssigned: (query.data ?? []).length > 0,
		clearAll,
	}
}
