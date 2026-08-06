import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import { isOrganStatusQuestion } from '@/shared/ai/intent/category-intent.patterns'
import type { QuestionType } from '@/shared/ai/evidence-planning/types'

const FACT_LOOKUP_PATTERN = /^(what is my|what's my|what was my|show my)\b/i

export function resolveQuestionType(input: {
	question: string
	intent: ClassifiedIntent
}): QuestionType {
	const normalized = input.question.trim()
	const { intent } = input.intent

	if (intent === 'LATEST_REPORT') {
		return 'LATEST_REPORT'
	}

	if (intent === 'EXPLAIN_METRIC') {
		return 'EXPLAIN'
	}

	if (intent === 'TREND_ANALYSIS') {
		return 'TREND'
	}

	if (intent === 'COMPARE_REPORTS') {
		return 'COMPARE'
	}

	if (
		intent === 'SPECIFIC_METRIC' &&
		FACT_LOOKUP_PATTERN.test(normalized) &&
		!/\bhow\b/i.test(normalized)
	) {
		return 'FACT_LOOKUP'
	}

	if (
		intent === 'GENERAL_HEALTH_SUMMARY' ||
		intent === 'ABNORMAL_RESULTS' ||
		intent === 'NORMAL_RESULTS' ||
		intent === 'RECOMMENDATIONS' ||
		intent === 'FOLLOW_UP_TESTS' ||
		(isOrganStatusQuestion(normalized) && input.intent.categoryId)
	) {
		return 'STATUS_OVERVIEW'
	}

	if (intent === 'SPECIFIC_METRIC') {
		return 'STATUS_OVERVIEW'
	}

	if (intent === 'UNKNOWN') {
		return 'UNKNOWN'
	}

	return 'STATUS_OVERVIEW'
}
