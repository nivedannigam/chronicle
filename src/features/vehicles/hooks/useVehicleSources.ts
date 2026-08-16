import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	assignVehicleSourceFolder,
	listVehicleSourceAssignments,
	removeVehicleSourceAssignment,
	toModuleFolderAssignments,
} from '@/features/family/services/vehicle-sources.service'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useVehicleSources(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: queryKeys.vehicles.sources(userId),
		queryFn: () => listVehicleSourceAssignments(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.vehicleSources,
	})

	const assignMutation = useMutation({
		mutationFn: assignVehicleSourceFolder,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.vehicles.sources(userId),
			})
		},
	})

	const removeMutation = useMutation({
		mutationFn: (assignmentId: string) =>
			removeVehicleSourceAssignment(userId!, assignmentId),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.vehicles.sources(userId),
			})
		},
	})

	const assignFolder = useCallback(
		async (
			input: Omit<Parameters<typeof assignVehicleSourceFolder>[0], 'userId'>,
		) => {
			if (!userId) {
				throw new Error('User not signed in')
			}

			return assignMutation.mutateAsync({ ...input, userId })
		},
		[assignMutation, userId],
	)

	return {
		assignments: query.data ?? [],
		moduleAssignments: toModuleFolderAssignments(query.data ?? []),
		isLoading: query.isLoading,
		error: query.error,
		assignFolder,
		removeAssignment: removeMutation.mutateAsync,
		refresh: query.refetch,
	}
}
