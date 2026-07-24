import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { browseDriveFolders } from '@/features/connectors/google-drive/services/google-drive-api.service'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useDriveBrowser(userId: string | undefined) {
	const [currentFolderId, setCurrentFolderId] = useState('root')

	const query = useInfiniteQuery({
		queryKey: queryKeys.connectors.driveBrowse(userId, currentFolderId),
		queryFn: async ({ pageParam }) => {
			logConnectorRequest(
				'useDriveBrowser',
				'drive-connector',
				`action=browse folder=${currentFolderId}`,
			)
			return browseDriveFolders({
				userId: userId!,
				folderId: currentFolderId,
				pageToken: pageParam ?? undefined,
			})
		},
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextPageToken,
		enabled: Boolean(userId),
		staleTime: STALE_TIME.driveBrowse,
	})

	const firstPage = query.data?.pages[0]
	const folders = useMemo(
		() => query.data?.pages.flatMap((page) => page.folders) ?? [],
		[query.data?.pages],
	)
	const files = useMemo(
		() => query.data?.pages.flatMap((page) => page.files) ?? [],
		[query.data?.pages],
	)

	const openFolder = useCallback((folderId: string) => {
		setCurrentFolderId(folderId)
	}, [])

	const goBack = useCallback(() => {
		if (firstPage?.parentFolderId) {
			setCurrentFolderId(firstPage.parentFolderId)
		}
	}, [firstPage])

	const loadMore = useCallback(() => {
		if (query.hasNextPage && !query.isFetchingNextPage) {
			void query.fetchNextPage()
		}
	}, [query])

	return {
		currentFolderId: firstPage?.currentFolderId ?? currentFolderId,
		currentFolderName: firstPage?.currentFolderName ?? 'My Drive',
		parentFolderId: firstPage?.parentFolderId ?? null,
		folders,
		files,
		nextPageToken: query.hasNextPage ? 'more' : null,
		isLoading: query.isLoading,
		isLoadingMore: query.isFetchingNextPage,
		isFetching: query.isFetching,
		isError: query.isError,
		error: query.error instanceof Error ? query.error.message : null,
		openFolder,
		goBack,
		loadMore,
		retry: () => query.refetch(),
	}
}
