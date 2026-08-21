import { downloadDriveFile } from '@/features/connectors/google-drive/services/google-drive-api.service'
import { resolveDocumentContent } from '@/features/document-intelligence/content/resolve-document-content.service'

export interface DownloadedRegistryDocument {
	storagePath: string
	fileSize: number
	sha256Checksum?: string
}

export async function downloadRegistryDocumentToStorage(input: {
	userId: string
	registryId: string
	externalFileId: string
	fileName: string
}): Promise<DownloadedRegistryDocument> {
	const download = await downloadDriveFile({
		userId: input.userId,
		externalFileId: input.externalFileId,
		fileName: input.fileName,
		registryId: input.registryId,
	})

	return {
		storagePath: download.storagePath,
		fileSize: download.fileSize,
		sha256Checksum: download.sha256Checksum,
	}
}

export async function extractTextFromStoredPdf(input: {
	userId: string
	documentId: string
	fileName: string
	storagePath: string
	uploadedAt?: string
}): Promise<{
	text: string
	confidence: number | null
	contentSource?: string | null
}> {
	const resolved = await resolveDocumentContent(input)

	return {
		text: resolved.content,
		confidence: resolved.confidence,
		contentSource: resolved.source,
	}
}
