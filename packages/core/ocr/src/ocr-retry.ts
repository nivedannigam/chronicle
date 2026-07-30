import { documentProcessingConfig } from './config/document-processing.config.ts'
import type { DocumentOCRProvider } from './providers/document-ocr-provider.interface'
import { getOcrErrorMessage, OcrProviderError } from './types/ocr-errors.types'
import type { OcrDocumentResult } from './types/ocr-result.types'
import type { OcrDocumentInput } from './types/ocr-document-input.types'
import {
	formatUnsupportedHealthReportMimeError,
	isSupportedHealthReportMimeType,
} from './supported-mime-types.ts'

export interface RunOcrWithRetryOptions {
	timeoutMs?: number
	minConfidence?: number
	maxRetries?: number
}

export interface RunOcrWithRetryResult {
	result: OcrDocumentResult
	attempts: number
}

function assertSupportedFormat(document: OcrDocumentInput): void {
	if (!isSupportedHealthReportMimeType(document.mimeType)) {
		throw new OcrProviderError(
			formatUnsupportedHealthReportMimeError(document.mimeType),
			'unsupported_format',
			false,
		)
	}
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(
				new OcrProviderError(
					`OCR timed out after ${timeoutMs}ms`,
					'timeout',
					true,
				),
			)
		}, timeoutMs)

		promise
			.then((value) => {
				clearTimeout(timer)
				resolve(value)
			})
			.catch((error) => {
				clearTimeout(timer)
				reject(error)
			})
	})
}

function wrapUnknownError(error: unknown): OcrProviderError {
	if (error instanceof OcrProviderError) {
		return error
	}

	return new OcrProviderError(
		error instanceof Error ? error.message : 'OCR processing failed.',
		'ocr_failure',
		true,
	)
}

export async function runOcrWithRetry(
	provider: DocumentOCRProvider,
	document: OcrDocumentInput,
	options: RunOcrWithRetryOptions = {},
): Promise<RunOcrWithRetryResult> {
	assertSupportedFormat(document)

	const timeoutMs = options.timeoutMs ?? documentProcessingConfig.ocrTimeoutMs
	const minConfidence =
		options.minConfidence ?? documentProcessingConfig.ocrMinConfidence
	const maxRetries =
		options.maxRetries ?? documentProcessingConfig.ocrMaxRetries

	let lastError: OcrProviderError | null = null

	for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
		try {
			const result = await withTimeout(
				provider.extractDocument(document),
				timeoutMs,
			)
			const confidence = provider.getConfidence(result)

			if (confidence < minConfidence) {
				throw new OcrProviderError(
					`OCR confidence ${confidence.toFixed(2)} is below threshold ${minConfidence.toFixed(2)}`,
					'low_confidence',
					false,
					confidence,
				)
			}

			return {
				result: {
					...result,
					confidence,
				},
				attempts: attempt,
			}
		} catch (error) {
			const ocrError = wrapUnknownError(error)
			lastError = ocrError

			const canRetry = ocrError.retryable && attempt <= maxRetries

			if (!canRetry) {
				throw new OcrProviderError(
					getOcrErrorMessage(ocrError),
					ocrError.code,
					false,
					ocrError.confidence,
				)
			}
		}
	}

	throw (
		lastError ??
		new OcrProviderError('OCR processing failed.', 'ocr_failure', false)
	)
}
