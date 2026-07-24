import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	approveAllLikelyMedical,
	approveDocument,
	listReviewDocuments,
	reassignDocument,
	rejectDocument,
} from '@/features/medical-discovery/services/import-review.service'
import type { ReviewDocument } from '@/features/medical-discovery/types/medical-discovery.types'
import { invalidateAfterImportReview } from '@/lib/query-invalidation'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

const REVIEW_SCOPE = 'actionable'

export function useImportReview(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: queryKeys.import.review(userId, REVIEW_SCOPE),
		queryFn: () => listReviewDocuments(userId!, REVIEW_SCOPE),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.importReview,
	})

	const updateDocumentsOptimistically = (
		updater: (documents: ReviewDocument[]) => ReviewDocument[],
	) => {
		if (!userId) {
			return
		}

		queryClient.setQueryData<ReviewDocument[]>(
			queryKeys.import.review(userId, REVIEW_SCOPE),
			(current) => updater(current ?? []),
		)
	}

	const approveMutation = useMutation({
		mutationFn: approveDocument,
		onMutate: async (registryId) => {
			if (!userId) {
				return
			}

			await queryClient.cancelQueries({
				queryKey: queryKeys.import.review(userId, REVIEW_SCOPE),
			})
			const previous = queryClient.getQueryData<ReviewDocument[]>(
				queryKeys.import.review(userId, REVIEW_SCOPE),
			)

			updateDocumentsOptimistically((documents) =>
				documents.filter((document) => document.registryId !== registryId),
			)

			return { previous }
		},
		onError: (_error, _registryId, context) => {
			if (userId && context?.previous) {
				queryClient.setQueryData(
					queryKeys.import.review(userId, REVIEW_SCOPE),
					context.previous,
				)
			}
		},
		onSettled: () => {
			invalidateAfterImportReview(userId)
		},
	})

	const rejectMutation = useMutation({
		mutationFn: rejectDocument,
		onMutate: async (registryId) => {
			if (!userId) {
				return
			}

			await queryClient.cancelQueries({
				queryKey: queryKeys.import.review(userId, REVIEW_SCOPE),
			})
			const previous = queryClient.getQueryData<ReviewDocument[]>(
				queryKeys.import.review(userId, REVIEW_SCOPE),
			)

			updateDocumentsOptimistically((documents) =>
				documents.filter((document) => document.registryId !== registryId),
			)

			return { previous }
		},
		onError: (_error, _registryId, context) => {
			if (userId && context?.previous) {
				queryClient.setQueryData(
					queryKeys.import.review(userId, REVIEW_SCOPE),
					context.previous,
				)
			}
		},
		onSettled: () => {
			invalidateAfterImportReview(userId)
		},
	})

	const reassignMutation = useMutation({
		mutationFn: async (input: {
			registryId: string
			familyMemberId: string
		}) => {
			await reassignDocument(input.registryId, input.familyMemberId)
		},
		onSettled: () => {
			invalidateAfterImportReview(userId)
		},
	})

	const approveAllMutation = useMutation({
		mutationFn: async () => {
			if (!userId) {
				return 0
			}

			return approveAllLikelyMedical(userId)
		},
		onSettled: () => {
			invalidateAfterImportReview(userId)
		},
	})

	return {
		documents: query.data ?? [],
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error instanceof Error ? query.error.message : null,
		refresh: () => query.refetch(),
		approve: (registryId: string) => approveMutation.mutateAsync(registryId),
		reject: (registryId: string) => rejectMutation.mutateAsync(registryId),
		reassign: (registryId: string, familyMemberId: string) =>
			reassignMutation.mutateAsync({ registryId, familyMemberId }),
		approveAllLikely: () => approveAllMutation.mutateAsync(),
	}
}
