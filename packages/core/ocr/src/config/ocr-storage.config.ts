export const ocrStorageConfig = {
	bucket: import.meta.env.VITE_OCR_STORAGE_BUCKET ?? 'health-reports',
} as const
