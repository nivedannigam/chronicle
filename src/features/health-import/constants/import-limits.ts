/** Max PDF size for health-reports storage bucket (50 MB). Keep in sync with migration. */
export const HEALTH_REPORT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export const FILE_TOO_LARGE_ERROR_PREFIX = 'File exceeds size limit'

export function isFileTooLargeError(
	message: string | null | undefined,
): boolean {
	if (!message) {
		return false
	}

	return (
		message.includes(FILE_TOO_LARGE_ERROR_PREFIX) ||
		message.includes('exceeded the maximum allowed size')
	)
}

export function formatFileTooLargeError(
	fileName: string,
	fileSizeBytes: number,
): string {
	const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(1)
	const limitMb = (HEALTH_REPORT_MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)

	return `${FILE_TOO_LARGE_ERROR_PREFIX}: "${fileName}" is ${sizeMb} MB (max ${limitMb} MB)`
}
