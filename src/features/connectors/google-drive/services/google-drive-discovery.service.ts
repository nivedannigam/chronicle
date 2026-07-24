import {
	buildFileFingerprint,
	findRegistryByExternalFileId,
	upsertRegistryRecord,
} from '@/features/connectors/services/connector-store.service'
import { listHealthSourceAssignments } from '@/features/family/services/health-sources.service'
import { discoverDriveFiles } from '@/features/connectors/google-drive/services/google-drive-api.service'
import type {
	ConnectorDiscoveryItem,
	ConnectorDiscoveryResult,
} from '@/core/connectors'

export async function discoverGoogleDriveDocuments(input: {
	userId: string
	incremental?: boolean
}): Promise<ConnectorDiscoveryResult> {
	const folders = (await listHealthSourceAssignments(input.userId)).filter(
		(folder) => folder.enabled,
	)

	if (folders.length === 0) {
		return { items: [], hasMore: false, nextPageToken: null }
	}

	const response = await discoverDriveFiles({
		userId: input.userId,
		folderIds: [...new Set(folders.map((folder) => folder.externalFolderId))],
	})

	const items: ConnectorDiscoveryItem[] = []

	for (const item of response.items) {
		const existing = await findRegistryByExternalFileId(
			input.userId,
			'google-drive',
			item.externalFileId,
		)

		if (
			input.incremental &&
			existing &&
			existing.checksum === item.checksum &&
			existing.importStatus === 'completed'
		) {
			continue
		}

		items.push(item)

		const folder = folders.find(
			(entry) => entry.externalFolderId === item.folderExternalId,
		)

		await upsertRegistryRecord({
			userId: input.userId,
			connectorId: 'google-drive',
			externalFileId: item.externalFileId,
			fileName: item.fileName,
			mimeType: item.mimeType,
			checksum: item.checksum,
			fileSize: item.fileSize,
			externalCreatedAt: item.externalCreatedAt,
			externalModifiedAt: item.externalModifiedAt,
			folderId: folder?.folderId ?? null,
		})
	}

	return {
		items,
		hasMore: response.hasMore,
		nextPageToken: response.nextPageToken,
	}
}

export function fingerprintDriveFile(input: {
	externalFileId: string
	modifiedAt: string
	fileSize: number
}): string {
	return buildFileFingerprint(input)
}
