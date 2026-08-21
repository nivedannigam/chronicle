import { evidenceBundleToSelectedEvidence } from '@/shared/ai/evidence-planning/evidence-bundle.adapter'
import { planEvidence } from '@/shared/ai/evidence-planning/evidence-planner'
import { resolveQuestionType } from '@/shared/ai/evidence-planning/question-type.resolver'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import {
	isPropertyCoverageQuestion,
	isPropertyEntityLookupQuestion,
	resolvePropertyEvidence,
} from '@/features/property/evidence/property-evidence.resolver'
import type { PropertyKnowledge } from '@/features/property-knowledge/types/property-knowledge.types'
import type { PropertyAskScope } from '@/features/property/types/property-ask.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'

function classifyPropertyIntent(question: string): ClassifiedIntent {
	const normalized = question.toLowerCase()

	if (isPropertyEntityLookupQuestion(normalized)) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'property',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Property inventory phrasing'],
		}
	}

	if (isPropertyCoverageQuestion(normalized)) {
		return {
			intent: 'GENERAL_HEALTH_SUMMARY',
			domain: 'property',
			confidence: 0.86,
			metricIds: [],
			metricNames: [],
			reasons: ['Property coverage phrasing'],
		}
	}

	if (
		/when did i buy|purchase date|possession|who owns|when was.*purchased/i.test(
			normalized,
		)
	) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'property',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Property fact lookup phrasing'],
		}
	}

	return {
		intent: 'GENERAL_HEALTH_SUMMARY',
		domain: 'property',
		confidence: 0.75,
		metricIds: [],
		metricNames: [],
		reasons: ['Default property overview intent'],
	}
}

function resolvePropertyQuestionType(
	question: string,
	intent: ClassifiedIntent,
): QuestionType {
	const normalized = question.toLowerCase()

	if (isPropertyEntityLookupQuestion(normalized)) {
		return 'ENTITY_LOOKUP'
	}

	if (isPropertyCoverageQuestion(normalized)) {
		return 'COVERAGE'
	}

	if (/when did i buy|purchase date|possession|who owns/i.test(normalized)) {
		return 'FACT_LOOKUP'
	}

	return resolveQuestionType({
		question,
		intent,
	})
}

export function planAndResolvePropertyEvidence(input: {
	question: string
	knowledge: PropertyKnowledge
	scope?: PropertyAskScope
}): {
	classifiedIntent: ClassifiedIntent
	questionType: QuestionType
	evidenceRequest: EvidenceRequest
	evidenceBundle: EvidenceBundle
	evidence: SelectedEvidence
} {
	const classifiedIntent = classifyPropertyIntent(input.question)
	const questionType = resolvePropertyQuestionType(
		input.question,
		classifiedIntent,
	)
	const evidenceRequest = planEvidence({
		question: input.question,
		questionType,
		domain: 'property',
		intent: classifiedIntent,
	})
	const evidenceBundle = resolvePropertyEvidence({
		knowledge: input.knowledge,
		request: evidenceRequest,
		scope: input.scope,
	})

	return {
		classifiedIntent,
		questionType,
		evidenceRequest,
		evidenceBundle,
		evidence: evidenceBundleToSelectedEvidence({
			bundle: evidenceBundle,
			classifiedIntent,
			question: input.question,
			domain: 'property',
		}),
	}
}
