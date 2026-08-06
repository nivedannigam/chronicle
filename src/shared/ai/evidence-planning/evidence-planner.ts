import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type {
	EvidenceRequest,
	EvidenceSubject,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'

export function planEvidence(input: {
	question: string
	questionType: QuestionType
	domain: KnowledgeDomainId
	intent: ClassifiedIntent
	categoryId?: string
	reportId?: string
	reportIds?: string[]
}): EvidenceRequest {
	const subject: EvidenceSubject = {
		categoryId: input.categoryId ?? input.intent.categoryId,
		metricIds:
			input.intent.metricIds.length > 0 ? input.intent.metricIds : undefined,
		metricNames:
			input.intent.metricNames.length > 0
				? input.intent.metricNames
				: undefined,
		reportId: input.reportId,
		reportIds: input.reportIds,
		timeRangeYears: input.intent.timeRangeYears,
	}

	return {
		questionType: input.questionType,
		domain: input.domain,
		subject,
		question: input.question,
	}
}
