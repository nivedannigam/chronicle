import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	assignFinanceSourceFolder,
	listFinanceSourceAssignments,
	removeFinanceSourceAssignment,
	clearFinanceSourceAssignments,
} from '@/features/finance/services/finance-sources.service'

export function financeSourcesKey(userId: string | undefined): string[] {
	return ['finance-sources', userId ?? 'anonymous']
}

export function useFinanceSources(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: financeSourcesKey(userId),
		queryFn: () => listFinanceSourceAssignments(userId!),
		enabled: Boolean(userId),
	})

	const assignMutation = useMutation({
		mutationFn: assignFinanceSourceFolder,
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: financeSourcesKey(variables.userId),
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
		}) => removeFinanceSourceAssignment(targetUserId, assignmentId),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: financeSourcesKey(variables.userId),
			})
		},
	})

	return {
		assignments: query.data ?? [],
		isLoading: query.isLoading,
		isError: query.isError,
		hasFolderAssigned: (query.data ?? []).length > 0,
		assignFolder: assignMutation.mutateAsync,
		removeAssignment: removeMutation.mutateAsync,
		clearAll: async () => {
			if (!userId) return
			await clearFinanceSourceAssignments(userId)
			await query.refetch()
		},
		refresh: query.refetch,
	}
}
