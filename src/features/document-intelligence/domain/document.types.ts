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
}): Document {
	return {
		id: input.id,
		userId: input.userId,
		fileName: input.fileName,
		storagePath: input.storagePath,
		mimeType: 'application/pdf',
		uploadedAt: input.uploadedAt,
	}
}
