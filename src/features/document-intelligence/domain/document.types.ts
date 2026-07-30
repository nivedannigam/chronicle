import { resolveHealthReportMimeType } from '@chronicle/core-ocr'

export interface Document {
	id: string
	userId: string
	fileName: string
	storagePath: string
	mimeType: string
	uploadedAt: string
}

export function createDocumentFromUpload(input: {
	id: string
	userId: string
	fileName: string
	storagePath: string
	uploadedAt: string
	mimeType?: string | null
}): Document {
	return {
		id: input.id,
		userId: input.userId,
		fileName: input.fileName,
		storagePath: input.storagePath,
		mimeType: resolveHealthReportMimeType({
			fileName: input.fileName,
			mimeType: input.mimeType,
		}),
		uploadedAt: input.uploadedAt,
	}
}
