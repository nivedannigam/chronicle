import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

/** Platform intent taxonomy — module-agnostic. */
export type ChronicleIntent =
	| 'GENERAL_HEALTH_SUMMARY'
	| 'LATEST_REPORT'
	| 'ABNORMAL_RESULTS'
	| 'NORMAL_RESULTS'
	| 'SPECIFIC_METRIC'
	| 'TREND_ANALYSIS'
	| 'COMPARE_REPORTS'
	| 'RECOMMENDATIONS'
	| 'FOLLOW_UP_TESTS'
	| 'EXPLAIN_METRIC'
	| 'UNKNOWN'

export interface ClassifiedIntent {
	intent: ChronicleIntent
	domain: KnowledgeDomainId
	confidence: number
	metricIds: string[]
	metricNames: string[]
	categoryId?: string
	timeRangeYears?: number
	reasons: string[]
}

export interface IntentClassifier {
	readonly domain: KnowledgeDomainId
	classify(question: string): ClassifiedIntent
}

export const LLM_SUPPORTED_INTENTS = new Set<ChronicleIntent>([
	'GENERAL_HEALTH_SUMMARY',
	'LATEST_REPORT',
	'ABNORMAL_RESULTS',
	'NORMAL_RESULTS',
	'SPECIFIC_METRIC',
	'TREND_ANALYSIS',
	'COMPARE_REPORTS',
	'RECOMMENDATIONS',
	'FOLLOW_UP_TESTS',
	'EXPLAIN_METRIC',
])

export function isLlmSupportedIntent(intent: ChronicleIntent): boolean {
	return LLM_SUPPORTED_INTENTS.has(intent)
}
