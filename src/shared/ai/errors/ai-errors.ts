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

export function mapErrorToUserMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : 'AI request failed'

	if (/timed out/i.test(message)) {
		return 'The AI request timed out. Here is what Chronicle found from your imported data instead.'
	}

	if (/quota|rate limit/i.test(message)) {
		return 'AI capacity is temporarily limited. Here is a grounded summary from your health records.'
	}

	if (/validation failed|invalid json|not supported/i.test(message)) {
		return 'Chronicle could not validate the AI response. Here is a grounded summary from your health records.'
	}

	return 'AI is temporarily unavailable. Here is a grounded summary from your health records.'
}

export { isLlmSupportedIntent }
