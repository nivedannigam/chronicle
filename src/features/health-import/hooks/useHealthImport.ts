import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import {
	cancelHealthImport,
	getActiveHealthImportJob,
	previewHealthImportDiscovery,
	retryHealthImport,
	runHealthImport,
	subscribeHealthImportProgress,
} from '@/features/health-import/services/health-import.service'
import { listImportHistory } from '@/features/health-import/services/import-history.service'
import {
	getImportNotifications,
	subscribeImportNotifications,
} from '@/features/health-import/services/import-notifications.service'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import type {
	HealthImportDiscoveryPreview,
	HealthImportJob,
	HealthImportSummary,
	HealthImportWizardStep,
	ImportNotification,
} from '@/features/health-import/types/health-import.types'
import { bucketRegistryRecords } from '@/features/health-import/types/health-import.types'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

const GOOGLE_DRIVE = 'google-drive'

export function useHealthImport(userId: string | undefined) {
	const [job, setJob] = useState<HealthImportJob | null>(
		getActiveHealthImportJob(),
	)
	const [wizardStep, setWizardStep] =
		useState<HealthImportWizardStep>('welcome')
	const [discovery, setDiscovery] =
		useState<HealthImportDiscoveryPreview | null>(null)
	const [summary, setSummary] = useState<HealthImportSummary | null>(null)
	const [notifications, setNotifications] = useState<ImportNotification[]>(
		getImportNotifications(),
	)
	const [error, setError] = useState<string | null>(null)

	const registryQuery = useQuery({
		queryKey: queryKeys.connectors.registry(userId, GOOGLE_DRIVE),
		queryFn: () => listRegistryRecords(userId!, GOOGLE_DRIVE),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.connectorRegistry,
	})

	const historyQuery = useQuery({
		queryKey: queryKeys.import.history(userId),
		queryFn: () => listImportHistory(userId!),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.importHistory,
	})

	useEffect(() => subscribeHealthImportProgress(setJob), [])
	useEffect(
		() =>
			subscribeImportNotifications(() => {
				setNotifications(getImportNotifications())
			}),
		[],
	)

	const runDiscoveryMutation = useMutation({
		mutationFn: async () => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			setWizardStep('discovery')
			return previewHealthImportDiscovery(userId)
		},
		onSuccess: (preview) => {
			setDiscovery(preview)
			setError(null)
		},
		onError: (discoveryError) => {
			setError(
				discoveryError instanceof Error
					? discoveryError.message
					: 'Discovery failed',
			)
		},
	})

	const startImportMutation = useMutation({
		mutationFn: async () => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			setWizardStep('import')
			setWizardStep('processing')
			return runHealthImport(userId)
		},
		onSuccess: (result) => {
			setSummary(result)
			setWizardStep('completion')
			setError(null)
			invalidateAfterHealthImport(userId)
		},
		onError: (importError) => {
			setError(
				importError instanceof Error ? importError.message : 'Import failed',
			)
		},
	})

	const retryMutation = useMutation({
		mutationFn: async () => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			await retryHealthImport(userId)
		},
		onSuccess: () => {
			invalidateAfterHealthImport(userId)
		},
	})

	const refresh = useCallback(async () => {
		await Promise.all([registryQuery.refetch(), historyQuery.refetch()])
	}, [historyQuery, registryQuery])

	const registry = registryQuery.data ?? []
	const buckets = bucketRegistryRecords(registry)

	return {
		job,
		wizardStep,
		setWizardStep,
		discovery,
		summary,
		registry,
		history: historyQuery.data ?? [],
		notifications,
		buckets,
		isRunning: startImportMutation.isPending || retryMutation.isPending,
		isLoading: registryQuery.isLoading || historyQuery.isLoading,
		isFetching: registryQuery.isFetching || historyQuery.isFetching,
		isError: registryQuery.isError || historyQuery.isError,
		error,
		runDiscovery: async () => runDiscoveryMutation.mutateAsync(),
		startImport: async () => {
			setError(null)
			await startImportMutation.mutateAsync()
		},
		cancel: () => {
			cancelHealthImport()
		},
		retry: async () => {
			await retryMutation.mutateAsync()
		},
		refresh,
	}
}
