import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	assignHealthSourceFolders,
	listHealthSourceAssignments,
	removeHealthSourceAndData,
	removeHealthSourceAssignment,
} from '@/features/family/services/health-sources.service'
import type { HealthSourceAssignment } from '@/features/family/types/family.types'
import {
	invalidateAfterHealthImport,
	invalidateHealthSourcesQueries,
} from '@/lib/query-invalidation'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useHealthSources(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: queryKeys.health.sources(userId),
		queryFn: () => listHealthSourceAssignments(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.healthSources,
	})

	const assignFoldersMutation = useMutation({
		mutationFn: async (input: {
			externalFolderId: string
			folderName: string
			familyMemberIds: string[]
			mode?: 'add' | 'replace'
		}) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			await assignHealthSourceFolders({
				userId,
				externalFolderId: input.externalFolderId,
				folderName: input.folderName,
				familyMemberIds: input.familyMemberIds,
				mode: input.mode,
			})
		},
		onMutate: async (input) => {
			if (!userId) {
				return
			}

			await queryClient.cancelQueries({
				queryKey: queryKeys.health.sources(userId),
			})
			const previous = queryClient.getQueryData<HealthSourceAssignment[]>(
				queryKeys.health.sources(userId),
			)

			if (previous) {
				const optimistic: HealthSourceAssignment[] = input.familyMemberIds.map(
					(memberId, index) => ({
						id: `optimistic-${input.externalFolderId}-${memberId}-${index}`,
						userId,
						familyMemberId: memberId,
						externalFolderId: input.externalFolderId,
						folderName: input.folderName,
						connectorId: 'google-drive',
						folderId: input.externalFolderId,
						familyMemberName: 'Assigning…',
						memberLabel: 'Assigning…',
						assignedAt: new Date().toISOString(),
						enabled: true,
					}),
				)

				queryClient.setQueryData(queryKeys.health.sources(userId), [
					...previous,
					...optimistic,
				])
			}

			return { previous }
		},
		onError: (_error, _input, context) => {
			if (userId && context?.previous) {
				queryClient.setQueryData(
					queryKeys.health.sources(userId),
					context.previous,
				)
			}
		},
		onSettled: () => {
			invalidateHealthSourcesQueries(userId)
		},
	})

	const removeAssignmentMutation = useMutation({
		mutationFn: async (input: {
			assignmentId: string
			deleteImportedData?: boolean
		}) => {
			if (input.deleteImportedData && userId) {
				await removeHealthSourceAndData(userId, input.assignmentId)
				return
			}

			await removeHealthSourceAssignment(input.assignmentId)
		},
		onSuccess: (_data, variables) => {
			if (variables.deleteImportedData) {
				invalidateAfterHealthImport(userId)
			}

			invalidateHealthSourcesQueries(userId)
		},
	})

	return {
		assignments: query.data ?? [],
		mappings: query.data ?? [],
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error instanceof Error ? query.error.message : null,
		refresh: () => query.refetch(),
		assignFolders: async (input: {
			externalFolderId: string
			folderName: string
			familyMemberIds: string[]
		}) => {
			await assignFoldersMutation.mutateAsync(input)
		},
		assignFolder: async (input: {
			externalFolderId: string
			folderName: string
			familyMemberIds: string[]
		}) => {
			await assignFoldersMutation.mutateAsync(input)
		},
		removeAssignment: async (
			assignmentId: string,
			options?: { deleteImportedData?: boolean },
		) => {
			await removeAssignmentMutation.mutateAsync({
				assignmentId,
				deleteImportedData: options?.deleteImportedData,
			})
		},
		removeMapping: async (
			assignmentId: string,
			options?: { deleteImportedData?: boolean },
		) => {
			await removeAssignmentMutation.mutateAsync({
				assignmentId,
				deleteImportedData: options?.deleteImportedData,
			})
		},
	}
}
