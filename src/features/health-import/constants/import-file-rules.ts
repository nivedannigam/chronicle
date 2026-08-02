/** Photos are stored for OCR elsewhere but not auto-imported as lab reports. */
export const PHOTO_IMPORT_SKIP_MESSAGE =
	'Photo skipped — assign PDF lab reports for automatic import.'

const PHOTO_EXTENSION_PATTERN = /\.(jpg|jpeg|png|gif|webp|heic|heif|tif|tiff)$/i

export function isPhotoImportFile(
	fileName: string,
	mimeType?: string | null,
): boolean {
	const mime = (mimeType ?? '').toLowerCase()

	if (mime.startsWith('image/')) {
		return true
	}

	return PHOTO_EXTENSION_PATTERN.test(fileName)
}
