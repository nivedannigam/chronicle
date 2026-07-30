import type { OcrProviderType } from './config/document-processing.config.ts'
import { formatOcrUserMessage } from './provider-limits.ts'

export type OcrConfigurationStatus = 'ready' | 'not_configured' | 'development'

export interface OcrProcessingEvent {
	message: string
	occurredAt: string
	source: 'report' | 'registry' | 'workflow'
}

export interface OcrProviderStatusSnapshot {
	providerType: OcrProviderType
	providerLabel: string
	configurationStatus: OcrConfigurationStatus
	configurationStatusLabel: string
	latestProcessingError: string | null
	latestProcessingErrorRaw: string | null
	lastSuccessfulAt: string | null
}

const CONFIG_ERROR_PATTERN =
	/not configured|provider_not_configured|GOOGLE_DOCUMENT_AI.*secret|deploy the document-ocr|503.*document-ocr|OCR unavailable\. Deploy/i

export function formatOcrProviderLabel(providerType: OcrProviderType): string {
	switch (providerType) {
		case 'google':
			return 'Google Document AI'
		case 'azure':
			return 'Azure Document Intelligence'
		case 'mock':
			return 'Mock OCR (development)'
		default:
			return providerType
	}
}

export function isOcrConfigurationError(message: string): boolean {
	return CONFIG_ERROR_PATTERN.test(message)
}

export function formatOcrRuntimeError(message: string): string {
	return formatOcrUserMessage(message)
}

function pickLatestEvent(
	events: OcrProcessingEvent[],
): OcrProcessingEvent | null {
	if (events.length === 0) {
		return null
	}

	return [...events].sort((left, right) =>
		right.occurredAt.localeCompare(left.occurredAt),
	)[0]
}

export function resolveOcrProviderStatus(input: {
	providerType: OcrProviderType
	failures: OcrProcessingEvent[]
	successes: OcrProcessingEvent[]
}): OcrProviderStatusSnapshot {
	const providerLabel = formatOcrProviderLabel(input.providerType)

	if (input.providerType === 'mock') {
		return {
			providerType: input.providerType,
			providerLabel,
			configurationStatus: 'development',
			configurationStatusLabel: 'Development',
			latestProcessingError: null,
			latestProcessingErrorRaw: null,
			lastSuccessfulAt: pickLatestEvent(input.successes)?.occurredAt ?? null,
		}
	}

	const configurationFailures = input.failures.filter((failure) =>
		isOcrConfigurationError(failure.message),
	)
	const runtimeFailures = input.failures.filter(
		(failure) => !isOcrConfigurationError(failure.message),
	)
	const lastSuccess = pickLatestEvent(input.successes)
	const latestRuntimeFailure = pickLatestEvent(runtimeFailures)
	const hasConfigurationIssue =
		configurationFailures.length > 0 && input.successes.length === 0

	const configurationStatus: OcrConfigurationStatus = hasConfigurationIssue
		? 'not_configured'
		: 'ready'

	const configurationStatusLabel =
		configurationStatus === 'not_configured' ? 'Not configured' : 'Ready'

	const shouldShowRuntimeError =
		latestRuntimeFailure != null &&
		(lastSuccess == null ||
			latestRuntimeFailure.occurredAt.localeCompare(lastSuccess.occurredAt) > 0)

	const latestProcessingErrorRaw = shouldShowRuntimeError
		? latestRuntimeFailure.message
		: null

	return {
		providerType: input.providerType,
		providerLabel,
		configurationStatus,
		configurationStatusLabel,
		latestProcessingError: latestProcessingErrorRaw
			? formatOcrRuntimeError(latestProcessingErrorRaw)
			: null,
		latestProcessingErrorRaw,
		lastSuccessfulAt: lastSuccess?.occurredAt ?? null,
	}
}
