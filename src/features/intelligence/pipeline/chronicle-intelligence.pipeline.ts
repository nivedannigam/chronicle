import {
	detectIntent,
	resolveQuestionWithContext,
} from '@/features/ask/retrieval/intent-detector'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import { runKnowledgeOrchestrator } from '@/features/intelligence/orchestrator/knowledge-orchestrator'
import {
	buildMemorySessionKey,
	resolveMemberFromQuestion,
} from '@/features/intelligence/services/member-context.service'
import type {
	IntelligenceQueryInput,
	IntelligencePipelineContext,
} from '@/features/intelligence/types/intelligence.types'

export function runIntelligencePipeline(
	input: IntelligenceQueryInput,
): IntelligencePipelineContext {
	const sessionKey = buildMemorySessionKey(input.userId, input.member.memberId)
	const previousTopic = conversationMemory.getPreviousTopic(sessionKey)
	const resolvedQuestion = resolveQuestionWithContext(
		input.question,
		previousTopic,
	)
	const detection = detectIntent(resolvedQuestion, previousTopic)
	const metricId = detection.metricName
		? (normalizeMetricName(detection.metricName).canonicalId ?? undefined)
		: undefined

	const orchestration = runKnowledgeOrchestrator({
		query: input,
		resolvedQuestion,
		detection,
		metricId,
	})

	return {
		input,
		resolvedQuestion: orchestration.resolvedQuestion,
		detection: orchestration.detection,
		member: orchestration.member,
		searchHits: orchestration.searchHits,
		builtContext: orchestration.builtContext,
		mergedKnowledge: orchestration.mergedKnowledge,
		activeDomains: orchestration.activeDomains,
		dataAvailable: orchestration.dataAvailable,
	}
}

export function resolveIntelligenceMember(input: {
	question: string
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: import('@/features/family/types/family.types').FamilyMemberWithAliases[]
}) {
	return resolveMemberFromQuestion(input)
}

export { generateFollowUpQuestions } from '@/features/intelligence/services/follow-up-generator.service'
