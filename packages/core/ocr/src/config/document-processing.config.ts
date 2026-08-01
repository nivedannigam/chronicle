export type OcrProviderType = 'mock' | 'google' | 'azure'

function readProvider(value: string | undefined): OcrProviderType {
	if (value === 'google' || value === 'azure' || value === 'mock') {
		return value
	}

	return import.meta.env.DEV ? 'mock' : 'google'
}

export const documentProcessingConfig = {
	ocrProvider: readProvider(import.meta.env.VITE_OCR_PROVIDER),
	ocrTimeoutMs: Number(
		import.meta.env.VITE_OCR_TIMEOUT_MS ??
			(readProvider(import.meta.env.VITE_OCR_PROVIDER) === 'google'
				? 120_000
				: 30_000),
	),
	ocrMinConfidence: Number(import.meta.env.VITE_OCR_MIN_CONFIDENCE ?? 0.5),
	ocrMaxRetries: Number(import.meta.env.VITE_OCR_MAX_RETRIES ?? 2),
} as const

export function isProductionOcrProvider(provider: OcrProviderType): boolean {
	return provider === 'google' || provider === 'azure'
}
