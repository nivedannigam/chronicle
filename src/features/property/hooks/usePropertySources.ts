import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	assignPropertySourceFolder,
	clearPropertySourceAssignments,
	listPropertySourceAssignments,
	removePropertySourceAssignment,
} from '@/features/property/services/property-sources.service'

export function propertySourcesKey(userId: string | undefined): string[] {
	return ['property-sources', userId ?? 'anonymous']
}

export function usePropertySources(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: propertySourcesKey(userId),
		queryFn: () => listPropertySourceAssignments(userId!),
		enabled: Boolean(userId),
	})

	const assignMutation = useMutation({
		mutationFn: assignPropertySourceFolder,
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: propertySourcesKey(variables.userId),
			})
		},
	})

	const removeMutation = useMutation({
		mutationFn: ({
			userId: targetUserId,
			assignmentId,
		}: {
			userId: string
			assignmentId: string
		}) => removePropertySourceAssignment(targetUserId, assignmentId),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: propertySourcesKey(variables.userId),
			})
		},
	})

	return {
		assignments: query.data ?? [],
		isLoading: query.isLoading,
		isError: query.isError,
		hasFolderAssigned: (query.data ?? []).length > 0,
		rootFolderPath:
			query.data?.[0]?.folderPath ?? query.data?.[0]?.folderName ?? null,
		assignFolder: assignMutation.mutateAsync,
		removeAssignment: removeMutation.mutateAsync,
		clearAll: async () => {
			if (!userId) return
			await clearPropertySourceAssignments(userId)
			await query.refetch()
		},
		refresh: query.refetch,
	}
}
