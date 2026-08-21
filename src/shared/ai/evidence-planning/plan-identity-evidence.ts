import { evidenceBundleToSelectedEvidence } from '@/shared/ai/evidence-planning/evidence-bundle.adapter'
import { planEvidence } from '@/shared/ai/evidence-planning/evidence-planner'
import { resolveQuestionType } from '@/shared/ai/evidence-planning/question-type.resolver'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import {
	isIdentityCoverageQuestion,
	isIdentityEntityLookupQuestion,
	resolveIdentityEvidence,
} from '@/features/identity/evidence/identity-evidence.resolver'
import type { IdentityKnowledge } from '@/features/identity-knowledge/types/identity-knowledge.types'
import type { IdentityAskScope } from '@/features/identity/types/identity-ask.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'

function classifyIdentityIntent(question: string): ClassifiedIntent {
	const normalized = question.toLowerCase()

	if (isIdentityEntityLookupQuestion(normalized)) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'identity',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Identity inventory phrasing'],
		}
	}

	if (isIdentityCoverageQuestion(normalized)) {
		return {
			intent: 'GENERAL_HEALTH_SUMMARY',
			domain: 'identity',
			confidence: 0.86,
			metricIds: [],
			metricNames: [],
			reasons: ['Identity coverage phrasing'],
		}
	}

	if (/latest|most recent|newest/i.test(normalized)) {
		return {
			intent: 'LATEST_REPORT',
			domain: 'identity',
			confidence: 0.82,
			metricIds: [],
			metricNames: [],
			reasons: ['Latest identity document phrasing'],
		}
	}

	if (
		/expir|valid until|when does|aadhaar|pan|passport|licence|license/i.test(
			normalized,
		)
	) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'identity',
			confidence: 0.84,
			metricIds: [],
			metricNames: [],
			reasons: ['Identity fact lookup phrasing'],
		}
	}

	return {
		intent: 'GENERAL_HEALTH_SUMMARY',
		domain: 'identity',
		confidence: 0.75,
		metricIds: [],
		metricNames: [],
		reasons: ['Default identity overview intent'],
	}
}

function resolveIdentityQuestionType(
	question: string,
	intent: ClassifiedIntent,
): QuestionType {
	const normalized = question.toLowerCase()

	if (isIdentityEntityLookupQuestion(normalized)) {
		return 'ENTITY_LOOKUP'
	}

	if (isIdentityCoverageQuestion(normalized)) {
		return 'COVERAGE'
	}

	if (/latest|most recent|newest/i.test(normalized)) {
		return 'LATEST_REPORT'
	}

	if (
		/expir|valid until|when does|aadhaar|pan|passport|licence|license|number/i.test(
			normalized,
		)
	) {
		return 'FACT_LOOKUP'
	}

	return resolveQuestionType({
		question,
		intent,
	})
}

export function planAndResolveIdentityEvidence(input: {
	question: string
	knowledge: IdentityKnowledge
	scope?: IdentityAskScope
}): {
	classifiedIntent: ClassifiedIntent
	questionType: QuestionType
	evidenceRequest: EvidenceRequest
	evidenceBundle: EvidenceBundle
	evidence: SelectedEvidence
} {
	const classifiedIntent = classifyIdentityIntent(input.question)
	const questionType = resolveIdentityQuestionType(
		input.question,
		classifiedIntent,
	)
	const evidenceRequest = planEvidence({
		question: input.question,
		questionType,
		domain: 'identity',
		intent: classifiedIntent,
	})
	const evidenceBundle = resolveIdentityEvidence({
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
			domain: 'identity',
		}),
	}
}
