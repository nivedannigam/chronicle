import {
	formatUnsupportedHealthReportMimeError,
	HEALTH_REPORT_SUPPORTED_FORMATS_LABEL,
} from '../supported-mime-types.ts'

export type OcrErrorCode =
	| 'unsupported_format'
	| 'ocr_failure'
	| 'timeout'
	| 'low_confidence'
	| 'provider_not_configured'

export class OcrProviderError extends Error {
	readonly code: OcrErrorCode
	readonly retryable: boolean
	readonly confidence?: number

	constructor(
		message: string,
		code: OcrErrorCode,
		retryable: boolean,
		confidence?: number,
	) {
		super(message)
		this.name = 'OcrProviderError'
		this.code = code
		this.retryable = retryable
		this.confidence = confidence
	}
}

export function getOcrErrorMessage(error: OcrProviderError): string {
	switch (error.code) {
		case 'unsupported_format':
			return error.message.includes('Supported:')
				? error.message
				: `Unsupported file type. Supported: ${HEALTH_REPORT_SUPPORTED_FORMATS_LABEL}.`
		case 'timeout':
			return 'Document processing timed out. Please try again.'
		case 'low_confidence':
			return `OCR confidence was too low (${Math.round((error.confidence ?? 0) * 100)}%). The document may be unclear or scanned poorly.`
		case 'provider_not_configured':
			return error.message
		case 'ocr_failure':
		default:
			return error.message || 'OCR processing failed.'
	}
}

export { formatUnsupportedHealthReportMimeError }
