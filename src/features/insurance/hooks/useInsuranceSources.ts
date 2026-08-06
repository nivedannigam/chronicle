import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	assignModuleFolder,
	listModuleFolderAssignments,
	removeModuleFolderAssignment,
} from '@/features/settings/services/module-folder-assignments.service'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useInsuranceSources(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: queryKeys.insurance.sources(userId),
		queryFn: () => listModuleFolderAssignments(userId!, 'insurance'),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.insuranceSources,
	})

	const assignMutation = useMutation({
		mutationFn: async (input: {
			externalFolderId: string
			folderName: string
			folderPath?: string | null
			familyMemberId: string
			familyMemberName: string
			memberLabel: string
			mode?: 'add' | 'replace'
		}) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			return assignModuleFolder({
				userId,
				moduleId: 'insurance',
				...input,
			})
		},
		onSuccess: (assignments) => {
			if (userId) {
				queryClient.setQueryData(
					queryKeys.insurance.sources(userId),
					assignments,
				)
			}
		},
	})

	const removeMutation = useMutation({
		mutationFn: async (assignmentId: string) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			await removeModuleFolderAssignment(userId, 'insurance', assignmentId)
		},
		onSuccess: async () => {
			await query.refetch()
		},
	})

	return {
		assignments: query.data ?? [],
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error instanceof Error ? query.error.message : null,
		refresh: () => query.refetch(),
		assignFolder: async (input: {
			externalFolderId: string
			folderName: string
			folderPath?: string | null
			familyMemberId: string
			familyMemberName: string
			memberLabel: string
			mode?: 'add' | 'replace'
		}) => assignMutation.mutateAsync(input),
		removeAssignment: async (assignmentId: string) =>
			removeMutation.mutateAsync(assignmentId),
	}
}

export type InsuranceSourceAssignment = ModuleFolderAssignment
