import { evidenceBundleToSelectedEvidence } from '@/shared/ai/evidence-planning/evidence-bundle.adapter'
import { planEvidence } from '@/shared/ai/evidence-planning/evidence-planner'
import { resolveQuestionType } from '@/shared/ai/evidence-planning/question-type.resolver'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import {
	isFinanceCoverageQuestion,
	isFinanceEntityLookupQuestion,
	resolveFinanceEvidence,
} from '@/features/finance/evidence/finance-evidence.resolver'
import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { FinanceAskScope } from '@/features/finance/types/finance-ask.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'

function classifyFinanceIntent(question: string): ClassifiedIntent {
	const normalized = question.toLowerCase()

	if (isFinanceCoverageQuestion(normalized)) {
		return {
			intent: 'GENERAL_HEALTH_SUMMARY',
			domain: 'finance',
			confidence: 0.86,
			metricIds: [],
			metricNames: [],
			reasons: ['Finance coverage phrasing'],
		}
	}

	if (isFinanceEntityLookupQuestion(normalized)) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'finance',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Finance entity inventory phrasing'],
		}
	}

	if (
		/compared with last year|compared to last year|year over year|versus last year/i.test(
			normalized,
		)
	) {
		return {
			intent: 'COMPARE_REPORTS',
			domain: 'finance',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Finance comparison phrasing'],
		}
	}

	if (
		/latest.*statement|most recent statement|latest financial statement/i.test(
			normalized,
		)
	) {
		return {
			intent: 'LATEST_REPORT',
			domain: 'finance',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Latest financial statement phrasing'],
		}
	}

	if (
		/why did.*change|why.*net worth|explain.*change|what changed/i.test(
			normalized,
		)
	) {
		return {
			intent: 'EXPLAIN_METRIC',
			domain: 'finance',
			confidence: 0.82,
			metricIds: [],
			metricNames: [],
			reasons: ['Finance explain-change phrasing'],
		}
	}

	if (
		/how has.*changed|how did.*change|over time|history|recently changed|what changed recently/i.test(
			normalized,
		)
	) {
		return {
			intent: 'TREND_ANALYSIS',
			domain: 'finance',
			confidence: 0.82,
			metricIds: [],
			metricNames: [],
			reasons: ['Finance trend phrasing'],
		}
	}

	if (
		/what is my|what's my|how much.*in my|balance|outstanding|amount due|how much do i have invested/i.test(
			normalized,
		)
	) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'finance',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Finance fact lookup phrasing'],
		}
	}

	if (
		/financial position|net worth|major liabilities|how is my finance|how is my financial picture|assets and liabilities/i.test(
			normalized,
		)
	) {
		return {
			intent: 'GENERAL_HEALTH_SUMMARY',
			domain: 'finance',
			confidence: 0.86,
			metricIds: [],
			metricNames: [],
			reasons: ['Finance overview phrasing'],
		}
	}

	return {
		intent: 'GENERAL_HEALTH_SUMMARY',
		domain: 'finance',
		confidence: 0.75,
		metricIds: [],
		metricNames: [],
		reasons: ['Default finance overview intent'],
	}
}

function resolveFinanceQuestionType(input: {
	question: string
	intent: ClassifiedIntent
}): QuestionType {
	if (isFinanceCoverageQuestion(input.question)) {
		return 'COVERAGE'
	}

	if (isFinanceEntityLookupQuestion(input.question)) {
		return 'ENTITY_LOOKUP'
	}

	if (
		/latest.*statement|most recent statement|latest financial statement/i.test(
			input.question,
		)
	) {
		return 'LATEST_REPORT'
	}

	if (
		/how much.*(in my|do i have)|what is my|what's my|balance|outstanding/i.test(
			input.question,
		) &&
		!/financial position|major liabilities|net worth/i.test(input.question)
	) {
		return 'FACT_LOOKUP'
	}

	return resolveQuestionType(input)
}

export function planAndResolveFinanceEvidence(input: {
	question: string
	knowledge: FinanceKnowledge
	scope?: FinanceAskScope
}): {
	classifiedIntent: ClassifiedIntent
	questionType: QuestionType
	evidenceRequest: EvidenceRequest
	evidenceBundle: EvidenceBundle
	evidence: SelectedEvidence
} {
	const classifiedIntent = classifyFinanceIntent(input.question)
	const questionType = resolveFinanceQuestionType({
		question: input.question,
		intent: classifiedIntent,
	})
	const evidenceRequest = planEvidence({
		question: input.question,
		questionType,
		domain: 'finance',
		intent: classifiedIntent,
	})
	const evidenceBundle = resolveFinanceEvidence({
		knowledge: input.knowledge,
		request: evidenceRequest,
		scope: input.scope,
	})
	const evidence = evidenceBundleToSelectedEvidence({
		bundle: evidenceBundle,
		classifiedIntent,
		question: input.question,
		domain: 'finance',
	})

	return {
		classifiedIntent,
		questionType,
		evidenceRequest,
		evidenceBundle,
		evidence,
	}
}
