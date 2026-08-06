import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import { planAndResolveHealthEvidence } from '@/shared/ai/evidence-planning/plan-health-evidence'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import type {
	HealthToolPayload,
	ToolResult,
} from '@/shared/ai/tools/tool.types'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import { healthIntentClassifier } from '@/shared/ai/intent/health-intent-classifier'

export interface IntentEvidenceResult {
	classifiedIntent: ClassifiedIntent
	questionType: QuestionType
	evidenceRequest: EvidenceRequest
	evidenceBundle: EvidenceBundle
	evidence: SelectedEvidence
	selectedTool: string
	toolResult: ToolResult<HealthToolPayload>
}

export async function classifyAndSelectHealthEvidence(input: {
	question: string
	knowledge: HealthKnowledge
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
	memberName?: string | null
	categoryId?: string
	reportId?: string
	reportIds?: string[]
	signal?: AbortSignal
}): Promise<IntentEvidenceResult> {
	void input.signal

	return planAndResolveHealthEvidence(input)
}

export function resolveDomainClassifier(domain: KnowledgeDomainId) {
	if (domain === 'health') {
		return healthIntentClassifier
	}

	return null
}
