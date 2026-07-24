import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { browseDriveFolders } from '@/features/connectors/google-drive/services/google-drive-api.service'
import {
	removeConnectorFolder,
	saveConnectorFolder,
	updateConnectorFolder,
} from '@/features/connectors/services/connector-store.service'
import type { ConnectorFolder, DriveBrowseFolder } from '@/core/connectors'
import { invalidateConnectorQueries } from '@/lib/query-invalidation'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

const CONNECTOR_ID = 'google-drive'

export function useDriveFolderPicker(
	userId: string | undefined,
	selectedFolders: ConnectorFolder[],
) {
	const [currentFolderId, setCurrentFolderId] = useState('root')

	const query = useQuery({
		queryKey: queryKeys.connectors.driveBrowse(userId, currentFolderId),
		queryFn: () =>
			browseDriveFolders({ userId: userId!, folderId: currentFolderId }),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.driveBrowse,
	})

	const loadFolder = useCallback((folderId = 'root') => {
		setCurrentFolderId(folderId)
	}, [])

	const invalidateFolders = useCallback(() => {
		invalidateConnectorQueries(userId)
	}, [userId])

	const selectFolderMutation = useMutation({
		mutationFn: async (input: {
			folder: DriveBrowseFolder
			alias?: string
		}) => {
			if (!userId) {
				throw new Error('You must be signed in.')
			}

			await saveConnectorFolder({
				userId,
				connectorId: CONNECTOR_ID,
				externalFolderId: input.folder.id,
				displayName: input.folder.name,
				alias: input.alias?.trim() || input.folder.name,
				enabled: true,
			})
		},
		onSuccess: invalidateFolders,
	})

	const toggleFolderMutation = useMutation({
		mutationFn: async (input: {
			folder: ConnectorFolder
			enabled: boolean
		}) => {
			await updateConnectorFolder(input.folder.id, { enabled: input.enabled })
		},
		onSuccess: invalidateFolders,
	})

	const renameFolderMutation = useMutation({
		mutationFn: async (input: { folder: ConnectorFolder; alias: string }) => {
			await updateConnectorFolder(input.folder.id, { alias: input.alias })
		},
		onSuccess: invalidateFolders,
	})

	const deleteFolderMutation = useMutation({
		mutationFn: async (folderId: string) => {
			await removeConnectorFolder(folderId)
		},
		onSuccess: invalidateFolders,
	})

	const isSelected = useCallback(
		(folderId: string) =>
			selectedFolders.some((folder) => folder.externalFolderId === folderId),
		[selectedFolders],
	)

	return {
		currentFolderId: query.data?.currentFolderId ?? currentFolderId,
		currentFolderName: query.data?.currentFolderName ?? 'My Drive',
		parentFolderId: query.data?.parentFolderId ?? null,
		folders: query.data?.folders ?? [],
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error instanceof Error ? query.error.message : null,
		loadFolder,
		selectFolder: async (folder: DriveBrowseFolder, alias?: string) => {
			await selectFolderMutation.mutateAsync({ folder, alias })
		},
		toggleFolder: async (folder: ConnectorFolder, enabled: boolean) => {
			await toggleFolderMutation.mutateAsync({ folder, enabled })
		},
		renameFolder: async (folder: ConnectorFolder, alias: string) => {
			await renameFolderMutation.mutateAsync({ folder, alias })
		},
		deleteFolder: async (folderId: string) => {
			await deleteFolderMutation.mutateAsync(folderId)
		},
		isSelected,
	}
}
