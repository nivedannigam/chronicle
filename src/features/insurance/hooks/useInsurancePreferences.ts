import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	loadInsurancePreferences,
	patchInsurancePreferences,
	recordInsuranceLastScan,
} from '@/features/insurance/services/insurance-preferences.service'
import type { InsuranceModulePreferences } from '@/features/insurance/types/insurance-preferences.types'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useInsurancePreferences(userId: string | undefined) {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: queryKeys.insurance.preferences(userId),
		queryFn: () => loadInsurancePreferences(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.default,
	})

	const updateMutation = useMutation({
		mutationFn: async (patch: Partial<InsuranceModulePreferences>) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			return patchInsurancePreferences(userId, patch)
		},
		onSuccess: (preferences) => {
			if (userId) {
				queryClient.setQueryData(
					queryKeys.insurance.preferences(userId),
					preferences,
				)
			}
		},
	})

	const recordScan = useCallback(() => {
		if (!userId) {
			return
		}

		const preferences = recordInsuranceLastScan(userId)
		queryClient.setQueryData(
			queryKeys.insurance.preferences(userId),
			preferences,
		)
	}, [queryClient, userId])

	return {
		preferences: query.data,
		isLoading: query.isLoading,
		updatePreferences: updateMutation.mutateAsync,
		recordScan,
	}
}
