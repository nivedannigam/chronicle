import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
	getDiscoveryDashboardStats,
	getLatestDiscoveryRun,
	listScoredDiscoveryFiles,
	runMedicalDiscovery,
} from '@/features/medical-discovery/services/medical-discovery-engine.service'
import type {
	DiscoveryFilterTab,
	DiscoveryRunSummary,
} from '@/features/medical-discovery/types/medical-discovery.types'
import { invalidateAfterDiscoveryScan } from '@/lib/query-invalidation'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useMedicalDiscovery(userId: string | undefined) {
	const queryClient = useQueryClient()
	const [filter, setFilter] = useState<DiscoveryFilterTab>('all')
	const [scanProgress, setScanProgress] = useState<{
		scanned: number
		total: number
	} | null>(null)

	const statsQuery = useQuery({
		queryKey: queryKeys.discovery.stats(userId),
		queryFn: () => getDiscoveryDashboardStats(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.discovery,
	})

	const lastRunQuery = useQuery({
		queryKey: queryKeys.discovery.latestRun(userId),
		queryFn: () => getLatestDiscoveryRun(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.discovery,
	})

	const filesQuery = useQuery({
		queryKey: queryKeys.discovery.files(userId, filter),
		queryFn: () =>
			listScoredDiscoveryFiles(userId!, filter === 'all' ? undefined : filter),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.discovery,
	})

	const runScanMutation = useMutation({
		mutationFn: async (mode: 'manual' | 'incremental') => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			const lastRun = queryClient.getQueryData<DiscoveryRunSummary | null>(
				queryKeys.discovery.latestRun(userId),
			)
			const modifiedSince =
				mode === 'incremental' && lastRun?.completedAt
					? lastRun.completedAt
					: null

			await runMedicalDiscovery({
				userId,
				mode,
				modifiedSince,
				onProgress: setScanProgress,
			})
		},
		onSuccess: () => {
			invalidateAfterDiscoveryScan(userId)
		},
		onSettled: () => {
			setScanProgress(null)
		},
	})

	const refresh = useCallback(async () => {
		await Promise.all([
			statsQuery.refetch(),
			lastRunQuery.refetch(),
			filesQuery.refetch(),
		])
	}, [filesQuery, lastRunQuery, statsQuery])

	const queryError =
		statsQuery.error ??
		lastRunQuery.error ??
		filesQuery.error ??
		runScanMutation.error

	return {
		stats: statsQuery.data ?? null,
		files: filesQuery.data ?? [],
		lastRun: lastRunQuery.data ?? null,
		filter,
		setFilter,
		isScanning: runScanMutation.isPending,
		scanProgress,
		isLoading:
			statsQuery.isLoading || lastRunQuery.isLoading || filesQuery.isLoading,
		isFetching:
			statsQuery.isFetching || lastRunQuery.isFetching || filesQuery.isFetching,
		isError: statsQuery.isError || lastRunQuery.isError || filesQuery.isError,
		error: queryError instanceof Error ? queryError.message : null,
		refresh,
		runScan: async (mode: 'manual' | 'incremental' = 'manual') => {
			await runScanMutation.mutateAsync(mode)
		},
	}
}
