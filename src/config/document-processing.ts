export type OcrProviderType = 'google' | 'azure'

function readProvider(value: string | undefined): OcrProviderType {
	if (value === 'google' || value === 'azure') {
		return value
	}

	return 'google'
}

export const documentProcessingConfig = {
	ocrProvider: readProvider(import.meta.env.VITE_OCR_PROVIDER),
	ocrTimeoutMs: Number(import.meta.env.VITE_OCR_TIMEOUT_MS ?? 30_000),
	ocrMinConfidence: Number(import.meta.env.VITE_OCR_MIN_CONFIDENCE ?? 0.5),
	ocrMaxRetries: Number(import.meta.env.VITE_OCR_MAX_RETRIES ?? 2),
} as const

export function isProductionOcrProvider(provider: OcrProviderType): boolean {
	return provider === 'google' || provider === 'azure'
}
