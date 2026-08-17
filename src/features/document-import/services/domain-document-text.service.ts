import {
	createDocumentFromUpload,
	defaultOCRProvider,
	runOcrWithRetry,
} from '@/features/document-intelligence'
import { downloadDriveFile } from '@/features/connectors/google-drive/services/google-drive-api.service'

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
}): Promise<{ text: string; confidence: number | null }> {
	const document = createDocumentFromUpload({
		id: input.documentId,
		userId: input.userId,
		fileName: input.fileName,
		storagePath: input.storagePath,
		uploadedAt: input.uploadedAt ?? new Date().toISOString(),
	})

	const { result } = await runOcrWithRetry(defaultOCRProvider, document, {
		maxRetries: 1,
	})

	return {
		text: result.rawText ?? '',
		confidence: result.confidence ?? null,
	}
}
