import type { DriveBrowseResult } from '@/core/connectors'
import {
	EdgeFunctionInvokeError,
	invokeEdgeFunction,
} from '@/lib/edge-function-invoke'

export interface DriveApiDebugEntry {
	action: string
	timestamp: string
	durationMs: number
	success: boolean
	detail?: string
}

const debugLog: DriveApiDebugEntry[] = []

export function getDriveApiDebugLog(): DriveApiDebugEntry[] {
	return [...debugLog]
}

function recordDebug(entry: DriveApiDebugEntry) {
	debugLog.unshift(entry)

	if (debugLog.length > 100) {
		debugLog.length = 100
	}
}

async function invokeDriveConnector<T>(
	body: Record<string, unknown>,
): Promise<T> {
	const startedAt = performance.now()
	const action = String(body.action ?? 'unknown')

	try {
		const data = await invokeEdgeFunction<T>('drive-connector', body)

		recordDebug({
			action,
			timestamp: new Date().toISOString(),
			durationMs: Math.round(performance.now() - startedAt),
			success: true,
		})

		return data
	} catch (error) {
		const detail =
			error instanceof EdgeFunctionInvokeError
				? error.toDebugString()
				: error instanceof Error
					? error.message
					: 'Drive API failed'

		recordDebug({
			action,
			timestamp: new Date().toISOString(),
			durationMs: Math.round(performance.now() - startedAt),
			success: false,
			detail,
		})

		throw error instanceof EdgeFunctionInvokeError
			? error
			: error instanceof Error
				? error
				: new Error('Drive API failed')
	}
}

export async function browseDriveFolders(input: {
	userId: string
	folderId?: string
	pageToken?: string | null
}): Promise<DriveBrowseResult> {
	const data = await invokeDriveConnector<
		DriveBrowseResult & { success?: boolean; error?: string }
	>({
		action: 'browse',
		userId: input.userId,
		folderId: input.folderId ?? 'root',
		pageToken: input.pageToken ?? null,
	})

	if (data.success === false || data.error) {
		throw new Error(data.error ?? 'Could not browse Google Drive')
	}

	return {
		folders: data.folders ?? [],
		files: data.files ?? [],
		currentFolderId: data.currentFolderId,
		currentFolderName: data.currentFolderName,
		parentFolderId: data.parentFolderId,
		nextPageToken: data.nextPageToken ?? null,
	}
}

export async function discoverDriveFiles(input: {
	userId: string
	folderIds: string[]
	pageToken?: string | null
	recursive?: boolean
	modifiedSince?: string | null
}) {
	const data = await invokeDriveConnector<{
		documents?: Array<{
			fileId: string
			name: string
			mimeType: string
			modifiedTime: string
			size: string
			folderId: string
			folderPath: string
			confidence: number
			reason: string[]
		}>
		items?: Array<{
			externalFileId: string
			fileName: string
			mimeType: string
			fileSize: number
			checksum: string
			externalCreatedAt: string
			externalModifiedAt: string
			folderExternalId: string
			folderPath?: string
			confidence?: number
			reason?: string[]
		}>
		hasMore: boolean
		nextPageToken: string | null
		success?: boolean
		error?: string
	}>({
		action: 'discover',
		userId: input.userId,
		folderIds: input.folderIds,
		pageToken: input.pageToken ?? null,
		recursive: input.recursive ?? true,
		modifiedSince: input.modifiedSince ?? null,
	})

	if (data.success === false || data.error) {
		throw new Error(data.error ?? 'Could not discover Google Drive files')
	}

	const items =
		data.items ??
		(data.documents ?? []).map((doc) => ({
			externalFileId: doc.fileId,
			fileName: doc.name,
			mimeType: doc.mimeType,
			fileSize: Number(doc.size),
			checksum: `${doc.fileId}:${doc.modifiedTime}:${doc.size}`,
			externalCreatedAt: doc.modifiedTime,
			externalModifiedAt: doc.modifiedTime,
			folderExternalId: doc.folderId,
			folderPath: doc.folderPath,
			confidence: doc.confidence,
			reason: doc.reason,
		}))

	return {
		items,
		hasMore: data.hasMore ?? false,
		nextPageToken: data.nextPageToken ?? null,
	}
}

export async function downloadDriveFile(input: {
	userId: string
	externalFileId: string
	fileName: string
}) {
	const data = await invokeDriveConnector<{
		storagePath: string
		fileSize: number
		sha256Checksum?: string
		success?: boolean
		error?: string
	}>({
		action: 'download',
		userId: input.userId,
		externalFileId: input.externalFileId,
		fileName: input.fileName,
	})

	if (data.success === false || data.error) {
		throw new Error(data.error ?? 'Could not download file from Google Drive')
	}

	if (!data.storagePath) {
		throw new Error('Download succeeded but no storage path returned')
	}

	return data
}
