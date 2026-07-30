export function sanitizeStorageFileName(fileName: string): string {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function buildUserScopedStoragePath(
	userId: string,
	objectId: string,
	fileName: string,
): string {
	return `${userId}/${objectId}_${sanitizeStorageFileName(fileName)}`
}
