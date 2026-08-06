import { evidenceBundleToSelectedEvidence } from '@/shared/ai/evidence-planning/evidence-bundle.adapter'
import { planEvidence } from '@/shared/ai/evidence-planning/evidence-planner'
import { resolveQuestionType } from '@/shared/ai/evidence-planning/question-type.resolver'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import { resolveHealthEvidence } from '@/features/health/evidence/health-evidence.resolver'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import { healthIntentClassifier } from '@/shared/ai/intent/health-intent-classifier'
import { recordEvidenceSelection } from '@/shared/ai/observability/evidence-observability'
import type {
	HealthToolPayload,
	ToolResult,
} from '@/shared/ai/tools/tool.types'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'

export interface PlanHealthEvidenceResult {
	classifiedIntent: ClassifiedIntent
	questionType: QuestionType
	evidenceRequest: EvidenceRequest
	evidenceBundle: EvidenceBundle
	evidence: SelectedEvidence
	selectedTool: string
	toolResult: ToolResult<HealthToolPayload>
}

export function planAndResolveHealthEvidence(input: {
	question: string
	knowledge: HealthKnowledge
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
	memberName?: string | null
	categoryId?: string
	reportId?: string
	reportIds?: string[]
}): PlanHealthEvidenceResult {
	const startedAt = Date.now()
	const classifiedIntent = healthIntentClassifier.classify(input.question)
	const resolvedCategoryId =
		input.categoryId ?? classifiedIntent.categoryId ?? undefined

	const questionType = resolveQuestionType({
		question: input.question,
		intent: classifiedIntent,
	})

	const evidenceRequest = planEvidence({
		question: input.question,
		questionType,
		domain: 'health',
		intent: classifiedIntent,
		categoryId: resolvedCategoryId,
		reportId: input.reportId,
		reportIds: input.reportIds,
	})

	const evidenceBundle = resolveHealthEvidence(input.knowledge, evidenceRequest)

	const evidence = evidenceBundleToSelectedEvidence({
		bundle: evidenceBundle,
		classifiedIntent,
		question: input.question,
		memberName: input.memberName,
	})

	recordEvidenceSelection({
		intent: classifiedIntent.intent,
		metadata: evidence.metadata,
	})

	const requestJson = JSON.stringify(evidenceRequest)
	const bundleJson = JSON.stringify(evidenceBundle)

	const toolResult: ToolResult<HealthToolPayload> = {
		success: true,
		tool: evidenceBundle.metadata.resolver,
		domain: 'health',
		data: {
			items: evidence.items,
			excluded: evidenceBundle.metadata.excluded,
			confidence: classifiedIntent.confidence,
		},
		confidence: classifiedIntent.confidence,
		executionTimeMs: Date.now() - startedAt,
		inputSizeChars: requestJson.length,
		outputSizeChars: bundleJson.length,
		retryCount: 0,
	}

	return {
		classifiedIntent,
		questionType,
		evidenceRequest,
		evidenceBundle,
		evidence,
		selectedTool: evidenceBundle.metadata.resolver,
		toolResult,
	}
}
