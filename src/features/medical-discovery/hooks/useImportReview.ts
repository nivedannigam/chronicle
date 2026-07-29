import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	approveAllLikelyMedical,
	listReviewDocuments,
	reassignDocument,
	rejectDocument,
} from '@/features/medical-discovery/services/import-review.service'
import {
	approveAndImportDocument,
	processApprovedImports,
} from '@/features/medical-discovery/services/import-pipeline.service'
import type { ReviewDocument } from '@/features/medical-discovery/types/medical-discovery.types'
import {
	invalidateAfterHealthImport,
	invalidateAfterImportReview,
} from '@/lib/query-invalidation'
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
		mutationFn: async (registryId: string) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			return approveAndImportDocument(userId, registryId)
		},
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
				documents.map((document) =>
					document.registryId === registryId
						? {
								...document,
								approvalStatus: 'approved' as const,
								importStatus: 'queued',
								errorMessage: null,
							}
						: document,
				),
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
			invalidateAfterHealthImport(userId)
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

			const approvedCount = await approveAllLikelyMedical(userId)
			if (approvedCount > 0) {
				await processApprovedImports(userId)
			}

			return approvedCount
		},
		onSettled: () => {
			invalidateAfterHealthImport(userId)
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
