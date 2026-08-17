import { evidenceBundleToSelectedEvidence } from '@/shared/ai/evidence-planning/evidence-bundle.adapter'
import { planEvidence } from '@/shared/ai/evidence-planning/evidence-planner'
import { resolveQuestionType } from '@/shared/ai/evidence-planning/question-type.resolver'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import { resolveVehicleEvidence } from '@/features/vehicles/evidence/vehicle-evidence.resolver'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'

function classifyVehicleIntent(question: string): ClassifiedIntent {
	const normalized = question.toLowerCase()

	if (/what is my|registration|vin|policy number|expir|puc/i.test(normalized)) {
		return {
			intent: 'SPECIFIC_METRIC',
			domain: 'vehicles',
			confidence: 0.82,
			metricIds: [],
			metricNames: [],
			reasons: ['Vehicle fact lookup phrasing'],
		}
	}

	if (/service|maintain|servicing|history|trend/i.test(normalized)) {
		return {
			intent: 'TREND_ANALYSIS',
			domain: 'vehicles',
			confidence: 0.8,
			metricIds: [],
			metricNames: [],
			reasons: ['Vehicle service history phrasing'],
		}
	}

	return {
		intent: 'GENERAL_HEALTH_SUMMARY',
		domain: 'vehicles',
		confidence: 0.75,
		metricIds: [],
		metricNames: [],
		reasons: ['Default vehicle overview intent'],
	}
}

export function planAndResolveVehicleEvidence(input: {
	question: string
	knowledge: VehicleKnowledge
}): {
	classifiedIntent: ClassifiedIntent
	questionType: QuestionType
	evidenceRequest: EvidenceRequest
	evidenceBundle: EvidenceBundle
	evidence: SelectedEvidence
} {
	const classifiedIntent = classifyVehicleIntent(input.question)
	const questionType = resolveQuestionType({
		question: input.question,
		intent: classifiedIntent,
	})
	const evidenceRequest = planEvidence({
		question: input.question,
		questionType,
		domain: 'vehicles',
		intent: classifiedIntent,
	})
	const evidenceBundle = resolveVehicleEvidence({
		knowledge: input.knowledge,
		request: evidenceRequest,
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
