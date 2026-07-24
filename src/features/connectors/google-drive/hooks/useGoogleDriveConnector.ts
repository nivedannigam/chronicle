import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { connectorManager } from '@/core/connectors'
import type { ConnectorConnectionStatus } from '@/core/connectors'
import {
	getConnectorConnection,
	getLatestSyncRun,
	listConnectorFolders,
	listRegistryRecords,
} from '@/features/connectors/services/connector-store.service'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
import { finalizeGoogleDriveConnection } from '@/features/connectors/google-drive/services/google-drive-auth.service'
import type { GoogleDriveConnectionSettings } from '@/features/connectors/google-drive/types/connection-settings'
import {
	retryFailedImports,
	runGoogleDriveSync,
} from '@/features/connectors/google-drive/services/google-drive-sync.service'
import { invalidateConnectorQueries } from '@/lib/query-invalidation'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

const CONNECTOR_ID = 'google-drive'

function readConnectionSettings(connection: Record<string, unknown> | null) {
	const settings =
		(connection?.settings as GoogleDriveConnectionSettings | undefined) ?? {}

	return {
		googleEmail: settings.googleEmail ?? null,
		connectedAt:
			(connection?.connected_at as string | null | undefined) ?? null,
		lastError: (connection?.last_error as string | null | undefined) ?? null,
	}
}

function resolveConnectionStatus(
	connection: Record<string, unknown> | null,
): ConnectorConnectionStatus {
	const status =
		(connection?.status as ConnectorConnectionStatus | undefined) ??
		'disconnected'
	return status === 'connected' ? 'connected' : status
}

export function useGoogleDriveConnector(userId: string | undefined) {
	const [actionError, setActionError] = useState<string | null>(null)

	const connectionQuery = useQuery({
		queryKey: queryKeys.connectors.connection(userId, CONNECTOR_ID),
		queryFn: async () => {
			logConnectorRequest(
				'useGoogleDriveConnector.connection',
				'connector_connections',
			)
			return getConnectorConnection(userId!, CONNECTOR_ID)
		},
		enabled: Boolean(userId),
		staleTime: STALE_TIME.connectorConnection,
	})

	const connection = connectionQuery.data ?? null
	const connectionStatus = resolveConnectionStatus(connection)
	const connectionDetails = readConnectionSettings(connection)
	const isConnected = connectionStatus === 'connected'

	const foldersQuery = useQuery({
		queryKey: queryKeys.connectors.folders(userId, CONNECTOR_ID),
		queryFn: async () => {
			logConnectorRequest(
				'useGoogleDriveConnector.folders',
				'connector_folders',
			)
			return listConnectorFolders(userId!, CONNECTOR_ID)
		},
		enabled: Boolean(userId) && isConnected,
		staleTime: STALE_TIME.connectorConnection,
	})

	const registryQuery = useQuery({
		queryKey: queryKeys.connectors.registry(userId, CONNECTOR_ID),
		queryFn: async () => {
			logConnectorRequest(
				'useGoogleDriveConnector.registry',
				'connector_document_registry',
			)
			return listRegistryRecords(userId!, CONNECTOR_ID)
		},
		enabled: Boolean(userId),
		staleTime: STALE_TIME.connectorRegistry,
	})

	const syncQuery = useQuery({
		queryKey: queryKeys.connectors.syncRun(userId, CONNECTOR_ID),
		queryFn: async () => {
			logConnectorRequest(
				'useGoogleDriveConnector.syncRuns',
				'connector_sync_runs',
			)
			return getLatestSyncRun(userId!, CONNECTOR_ID)
		},
		enabled: Boolean(userId),
		staleTime: STALE_TIME.connectorRegistry,
	})

	const refresh = useCallback(
		async (
			_source?: string,
			options: {
				folders?: boolean
				registry?: boolean
				syncRuns?: boolean
			} = {},
		) => {
			void _source
			const tasks = [connectionQuery.refetch()]

			if (options.folders ?? isConnected) {
				tasks.push(foldersQuery.refetch())
			}

			if (options.registry ?? false) {
				tasks.push(registryQuery.refetch())
			}

			if (options.syncRuns ?? false) {
				tasks.push(syncQuery.refetch())
			}

			const [connectionResult] = await Promise.all(tasks)
			return connectionResult.data ?? null
		},
		[connectionQuery, foldersQuery, isConnected, registryQuery, syncQuery],
	)

	const connectMutation = useMutation({
		mutationFn: async () => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			logConnectorRequest('useGoogleDriveConnector.connect', 'google-oauth')
			await connectorManager.connect('google-drive', { userId })
		},
		onMutate: () => {
			setActionError(null)
		},
		onError: (connectError) => {
			setActionError(
				connectError instanceof Error
					? connectError.message
					: 'Connection failed',
			)
		},
	})

	const finalizeOAuthMutation = useMutation({
		mutationFn: async (
			sessionOverride?: {
				provider_token?: string | null
				provider_refresh_token?: string | null
			} | null,
		) => {
			if (!userId) {
				return false
			}

			const result = await finalizeGoogleDriveConnection(
				userId,
				sessionOverride,
			)
			return result.success && result.connected
		},
		onMutate: () => {
			setActionError(null)
		},
		onSuccess: (connected) => {
			if (connected) {
				invalidateConnectorQueries(userId)
			}
		},
		onError: (finalizeError) => {
			setActionError(
				finalizeError instanceof Error
					? finalizeError.message
					: 'Failed to finalize Google Drive connection',
			)
		},
	})

	const disconnectMutation = useMutation({
		mutationFn: async () => {
			if (!userId) {
				return
			}

			await connectorManager.disconnect('google-drive', { userId })
		},
		onMutate: () => {
			setActionError(null)
		},
		onSuccess: () => {
			invalidateConnectorQueries(userId)
		},
	})

	const syncMutation = useMutation({
		mutationFn: async (mode: 'initial' | 'incremental' | 'manual') => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			await runGoogleDriveSync({ userId, mode })
		},
		onMutate: () => {
			setActionError(null)
		},
		onSuccess: () => {
			invalidateConnectorQueries(userId)
		},
		onError: (syncError) => {
			setActionError(
				syncError instanceof Error ? syncError.message : 'Sync failed',
			)
		},
	})

	const retryFailedMutation = useMutation({
		mutationFn: async () => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			await retryFailedImports(userId)
		},
		onSuccess: () => {
			invalidateConnectorQueries(userId)
		},
	})

	const folders = foldersQuery.data ?? []
	const registry = registryQuery.data ?? []

	const stats = useMemo(
		() => ({
			foldersConnected: (foldersQuery.data ?? []).filter(
				(folder) => folder.enabled,
			).length,
			filesImported: (registryQuery.data ?? []).filter(
				(record) => record.importStatus === 'completed',
			).length,
			filesPending: (registryQuery.data ?? []).filter(
				(record) =>
					record.importStatus !== 'completed' &&
					record.importStatus !== 'failed',
			).length,
			filesFailed: (registryQuery.data ?? []).filter(
				(record) => record.importStatus === 'failed',
			).length,
		}),
		[foldersQuery.data, registryQuery.data],
	)

	const queryError =
		connectionQuery.error ??
		foldersQuery.error ??
		registryQuery.error ??
		syncQuery.error

	return {
		connectionStatus,
		googleEmail: isConnected ? connectionDetails.googleEmail : null,
		connectedAt: isConnected ? connectionDetails.connectedAt : null,
		lastError: isConnected ? null : connectionDetails.lastError,
		isConnecting: connectMutation.isPending || finalizeOAuthMutation.isPending,
		folders,
		registry,
		latestSync: syncQuery.data ?? null,
		isSyncing: syncMutation.isPending || retryFailedMutation.isPending,
		isLoading:
			connectionQuery.isLoading ||
			foldersQuery.isLoading ||
			registryQuery.isLoading ||
			syncQuery.isLoading,
		isFetching:
			connectionQuery.isFetching ||
			foldersQuery.isFetching ||
			registryQuery.isFetching ||
			syncQuery.isFetching,
		isError:
			connectionQuery.isError ||
			foldersQuery.isError ||
			registryQuery.isError ||
			syncQuery.isError,
		error:
			actionError ?? (queryError instanceof Error ? queryError.message : null),
		stats,
		connect: () => connectMutation.mutateAsync(),
		disconnect: () => disconnectMutation.mutateAsync(),
		finalizeOAuthReturn: (
			sessionOverride?: {
				provider_token?: string | null
				provider_refresh_token?: string | null
			} | null,
		) => finalizeOAuthMutation.mutateAsync(sessionOverride),
		sync: (mode: 'initial' | 'incremental' | 'manual' = 'manual') =>
			syncMutation.mutateAsync(mode),
		retryFailed: () => retryFailedMutation.mutateAsync(),
		refresh,
	}
}
