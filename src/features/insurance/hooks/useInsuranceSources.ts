import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	assignInsuranceSourceFolder,
	listInsuranceSourceAssignments,
	removeInsuranceSourceAssignment,
	toModuleFolderAssignments,
} from '@/features/family/services/insurance-sources.service'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useInsuranceSources(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: queryKeys.insurance.sources(userId),
		queryFn: () => listInsuranceSourceAssignments(userId!),
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
			discoveredCategories?: string[]
			mode?: 'add' | 'replace'
		}) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			return assignInsuranceSourceFolder({
				userId,
				externalFolderId: input.externalFolderId,
				folderName: input.folderName,
				folderPath: input.folderPath,
				familyMemberId: input.familyMemberId,
				discoveredCategories: input.discoveredCategories,
				mode: input.mode,
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

			await removeInsuranceSourceAssignment(userId, assignmentId)
		},
		onSuccess: async () => {
			await query.refetch()
		},
	})

	const assignments: ModuleFolderAssignment[] = toModuleFolderAssignments(
		query.data ?? [],
	)

	return {
		assignments,
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
			discoveredCategories?: string[]
			mode?: 'add' | 'replace'
		}) => assignMutation.mutateAsync(input),
		removeAssignment: async (assignmentId: string) =>
			removeMutation.mutateAsync(assignmentId),
	}
}

export type InsuranceSourceAssignment = ModuleFolderAssignment
