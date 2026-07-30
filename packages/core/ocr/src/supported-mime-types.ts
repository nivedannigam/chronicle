/** MIME types accepted for health report ingestion (storage + OCR). */
export const HEALTH_REPORT_SUPPORTED_MIME_TYPES = [
	'application/pdf',
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/heic',
	'image/heif',
	'image/tiff',
	'image/webp',
] as const

export type HealthReportMimeType =
	(typeof HEALTH_REPORT_SUPPORTED_MIME_TYPES)[number]

export const HEALTH_REPORT_SUPPORTED_FORMATS_LABEL = 'PDF, JPG, PNG, HEIC, TIFF'

const EXTENSION_MIME_MAP: Record<string, HealthReportMimeType> = {
	pdf: 'application/pdf',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	heic: 'image/heic',
	heif: 'image/heif',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	webp: 'image/webp',
}

export function normalizeHealthReportMimeType(mimeType: string): string {
	const mime = mimeType.trim().toLowerCase()

	if (mime === 'image/jpg') {
		return 'image/jpeg'
	}

	return mime
}

export function isPdfMimeType(mimeType: string): boolean {
	return normalizeHealthReportMimeType(mimeType) === 'application/pdf'
}

export function isImageMimeType(mimeType: string): boolean {
	return normalizeHealthReportMimeType(mimeType).startsWith('image/')
}

export function isSupportedHealthReportMimeType(mimeType: string): boolean {
	const normalized = normalizeHealthReportMimeType(mimeType)

	return HEALTH_REPORT_SUPPORTED_MIME_TYPES.some(
		(supported) => normalizeHealthReportMimeType(supported) === normalized,
	)
}

export function inferHealthReportMimeType(fileName: string): string {
	const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
	const fromExtension = EXTENSION_MIME_MAP[extension]

	if (fromExtension) {
		return normalizeHealthReportMimeType(fromExtension)
	}

	return 'application/pdf'
}

export function resolveHealthReportMimeType(input: {
	fileName: string
	mimeType?: string | null
}): string {
	if (input.mimeType && isSupportedHealthReportMimeType(input.mimeType)) {
		return normalizeHealthReportMimeType(input.mimeType)
	}

	return inferHealthReportMimeType(input.fileName)
}

export function formatUnsupportedHealthReportMimeError(
	mimeType?: string,
): string {
	const detail = mimeType
		? ` Received: ${normalizeHealthReportMimeType(mimeType)}.`
		: ''

	return `Unsupported file type.${detail} Supported: ${HEALTH_REPORT_SUPPORTED_FORMATS_LABEL}.`
}

export function formatStorageMimeRejectionError(
	storageMessage: string,
	contentType?: string,
): string {
	const lower = storageMessage.toLowerCase()

	if (
		lower.includes('mime type') &&
		(lower.includes('not supported') || lower.includes('invalid'))
	) {
		return formatUnsupportedHealthReportMimeError(contentType)
	}

	if (storageMessage.startsWith('Storage upload')) {
		return storageMessage
	}

	return `Storage upload to health-reports failed: ${storageMessage}`
}
