import {
	getAIPlatformConfigurationError,
	isAIPlatformConfigured,
} from '@/shared/ai/config/ai-platform.config'
import {
	isLlmSupportedIntent,
	type ChronicleIntent,
} from '@/shared/ai/intent/intent.types'
import { healthIntentClassifier } from '@/shared/ai/intent/health-intent-classifier'

/** Map legacy Ask intents to platform intents for routing. */
const LEGACY_ASK_INTENT_MAP: Record<string, ChronicleIntent> = {
	summarize_report: 'LATEST_REPORT',
	latest_report: 'LATEST_REPORT',
	summarize_health: 'GENERAL_HEALTH_SUMMARY',
	metric_explanation: 'EXPLAIN_METRIC',
	explain_metric: 'EXPLAIN_METRIC',
	compare_reports: 'COMPARE_REPORTS',
	trend_analysis: 'TREND_ANALYSIS',
	abnormal_summary: 'ABNORMAL_RESULTS',
	recommendations: 'RECOMMENDATIONS',
}

export function classifyQuestionIntent(question: string) {
	return healthIntentClassifier.classify(question)
}

export function isProductionAiIntent(intent: string): boolean {
	const mapped = LEGACY_ASK_INTENT_MAP[intent]
	return mapped ? isLlmSupportedIntent(mapped) : false
}

export function isLlmHealthQuestion(input: {
	question: string
	legacyIntent?: string
}): boolean {
	if (input.legacyIntent && isProductionAiIntent(input.legacyIntent)) {
		return true
	}

	const classified = healthIntentClassifier.classify(input.question)
	return isLlmSupportedIntent(classified.intent)
}

export function isProductionAiQuestion(input: {
	question: string
	legacyIntent?: string
}): boolean {
	return isLlmHealthQuestion(input) && isAIPlatformConfigured()
}

export function getProductionAiConfigurationError(): string | null {
	if (isAIPlatformConfigured()) {
		return null
	}

	return getAIPlatformConfigurationError()
}

export type GeminiFailureKind =
	| 'auth'
	| 'billing'
	| 'rate_limit'
	| 'model_not_found'
	| 'timeout'
	| 'validation'
	| 'generic'

export interface ClassifiedGeminiFailure {
	kind: GeminiFailureKind
	userMessage: string
	statusCode?: number
}

function normalizeGeminiErrorText(input: {
	message?: string
	providerResponse?: string
}): string {
	return `${input.message ?? ''} ${input.providerResponse ?? ''}`.toLowerCase()
}

function isPrepayCreditsDepleted(text: string): boolean {
	return (
		text.includes('prepayment credits depleted') ||
		text.includes('prepay credits depleted') ||
		(text.includes('prepay') && text.includes('depleted'))
	)
}

function isModelNotFound(
	statusCode: number | undefined,
	text: string,
): boolean {
	return (
		statusCode === 404 ||
		(/\bmodel\b/.test(text) &&
			(text.includes('not found') ||
				text.includes('not available') ||
				text.includes('does not exist')))
	)
}

export function classifyGeminiFailure(input: {
	statusCode?: number
	message?: string
	providerResponse?: string
}): ClassifiedGeminiFailure {
	const text = normalizeGeminiErrorText(input)
	const statusCode = input.statusCode

	if (
		statusCode === 401 ||
		/unauthorized|invalid or expired session|sign in again|authentication failed/i.test(
			text,
		)
	) {
		return {
			kind: 'auth',
			userMessage: 'Ask AI authentication failed. Sign in again and retry.',
			statusCode: statusCode ?? 401,
		}
	}

	if (isModelNotFound(statusCode, text)) {
		return {
			kind: 'model_not_found',
			userMessage:
				'The configured Gemini model is not available. Check deployment settings or contact support.',
			statusCode: statusCode ?? 404,
		}
	}

	if (statusCode === 429 && isPrepayCreditsDepleted(text)) {
		return {
			kind: 'billing',
			userMessage:
				'Gemini prepay credits are depleted. Add billing credits in Google AI Studio and retry.',
			statusCode: 429,
		}
	}

	if (
		statusCode === 429 ||
		text.includes('rate limit') ||
		text.includes('too many requests')
	) {
		return {
			kind: 'rate_limit',
			userMessage: 'Gemini rate limit reached. Please try again shortly.',
			statusCode: statusCode ?? 429,
		}
	}

	if (
		statusCode === 403 ||
		text.includes('quota') ||
		text.includes('billing') ||
		isPrepayCreditsDepleted(text)
	) {
		return {
			kind: 'billing',
			userMessage:
				'Gemini prepay credits are depleted. Add billing credits in Google AI Studio and retry.',
			statusCode: statusCode ?? 403,
		}
	}

	if (
		statusCode === 408 ||
		text.includes('timeout') ||
		text.includes('timed out') ||
		text.includes('abort')
	) {
		return {
			kind: 'timeout',
			userMessage:
				'The AI request timed out. Here is what Chronicle found from your imported data instead.',
			statusCode: statusCode ?? 408,
		}
	}

	if (/validation failed|invalid json|not supported/i.test(text)) {
		return {
			kind: 'validation',
			userMessage:
				'Chronicle could not validate the AI response. Here is a grounded summary from your health records.',
			statusCode,
		}
	}

	return {
		kind: 'generic',
		userMessage:
			input.message ??
			'AI is temporarily unavailable. Here is a grounded summary from your health records.',
		statusCode,
	}
}

export function mapGeminiFailureToUserMessage(input: {
	statusCode?: number
	message?: string
	providerResponse?: string
	fallbackMessage?: string
}): string {
	return classifyGeminiFailure(input).userMessage
}

export function mapErrorToUserMessage(error: unknown): string {
	if (error instanceof Error) {
		const providerResponse =
			'providerResponse' in error && typeof error.providerResponse === 'string'
				? error.providerResponse
				: undefined
		const statusCode =
			'statusCode' in error && typeof error.statusCode === 'number'
				? error.statusCode
				: undefined

		return mapGeminiFailureToUserMessage({
			statusCode,
			message: error.message,
			providerResponse,
		})
	}

	return mapGeminiFailureToUserMessage({
		message: 'AI request failed',
	})
}

export { isLlmSupportedIntent }
