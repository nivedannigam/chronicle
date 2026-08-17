import { evidenceBundleToSelectedEvidence } from '@/shared/ai/evidence-planning/evidence-bundle.adapter'
import { planEvidence } from '@/shared/ai/evidence-planning/evidence-planner'
import { resolveQuestionType } from '@/shared/ai/evidence-planning/question-type.resolver'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import { resolveInsuranceEvidence } from '@/features/insurance/evidence/insurance-evidence.resolver'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceAskScope } from '@/features/insurance/types/insurance-ask.types'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'

function classifyInsuranceIntent(question: string): ClassifiedIntent {
	const normalized = question.toLowerCase()

	if (
		/what is my|what's my|policy number|premium|expir|renew/i.test(normalized)
	) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'insurance',
			confidence: 0.82,
			metricIds: [],
			metricNames: [],
			reasons: ['Insurance fact lookup phrasing'],
		}
	}

	if (/compare|duplicate|overlap/i.test(normalized)) {
		return {
			intent: 'COMPARE_REPORTS',
			domain: 'insurance',
			confidence: 0.8,
			metricIds: [],
			metricNames: [],
			reasons: ['Insurance comparison phrasing'],
		}
	}

	if (/timeline|history|changed|renewed/i.test(normalized)) {
		return {
			intent: 'TREND_ANALYSIS',
			domain: 'insurance',
			confidence: 0.78,
			metricIds: [],
			metricNames: [],
			reasons: ['Insurance trend phrasing'],
		}
	}

	return {
		intent: 'GENERAL_HEALTH_SUMMARY',
		domain: 'insurance',
		confidence: 0.75,
		metricIds: [],
		metricNames: [],
		reasons: ['Default insurance overview intent'],
	}
}

export function planAndResolveInsuranceEvidence(input: {
	question: string
	knowledge: InsuranceKnowledge
	scope?: InsuranceAskScope
}): {
	classifiedIntent: ClassifiedIntent
	questionType: QuestionType
	evidenceRequest: EvidenceRequest
	evidenceBundle: EvidenceBundle
	evidence: SelectedEvidence
} {
	const classifiedIntent = classifyInsuranceIntent(input.question)
	const questionType = resolveQuestionType({
		question: input.question,
		intent: classifiedIntent,
	})
	const evidenceRequest = planEvidence({
		question: input.question,
		questionType,
		domain: 'insurance',
		intent: classifiedIntent,
	})
	const evidenceBundle = resolveInsuranceEvidence({
		knowledge: input.knowledge,
		request: evidenceRequest,
		scope: input.scope,
	})
	const evidence = evidenceBundleToSelectedEvidence({
		bundle: evidenceBundle,
		classifiedIntent,
		question: input.question,
	})

	return {
		classifiedIntent,
		questionType,
		evidenceRequest,
		evidenceBundle,
		evidence,
	}
}
