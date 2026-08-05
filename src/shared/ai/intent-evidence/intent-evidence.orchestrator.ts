import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import { healthIntentClassifier } from '@/shared/ai/intent/health-intent-classifier'
import { recordEvidenceSelection } from '@/shared/ai/observability/evidence-observability'
import { createToolContext } from '@/shared/ai/tools/tool-permissions'
import { defaultToolExecutor } from '@/shared/ai/tools/tool-executor'
import { selectToolForIntent } from '@/shared/ai/tools/tool-selector'
import { toolResultToEvidence } from '@/shared/ai/tools/tool-result-to-evidence'
import type {
	HealthToolPayload,
	ToolResult,
} from '@/shared/ai/tools/tool.types'
import '@/shared/ai/tools/health/register-health-tools'
import {
	defaultKnowledgeGraphService,
	mergeGraphAndToolEvidence,
} from '@/shared/knowledge-graph'
import type { GraphContext } from '@/shared/knowledge-graph/types/graph.types'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export interface IntentEvidenceResult {
	classifiedIntent: ClassifiedIntent
	evidence: SelectedEvidence
	selectedTool: string
	toolResult: ToolResult<HealthToolPayload>
	graphContext: GraphContext
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
	const classifiedIntent = healthIntentClassifier.classify(input.question)

	const resolvedCategoryId =
		input.categoryId ?? classifiedIntent.categoryId ?? undefined
	const hasScope = Boolean(input.reportId) || (input.reportIds?.length ?? 0) > 0

	defaultKnowledgeGraphService.clear()
	defaultKnowledgeGraphService.loadHealthKnowledge(input.knowledge)

	const graphContext = defaultKnowledgeGraphService.buildContext({
		question: input.question,
		intent: classifiedIntent.intent,
		metricIds: classifiedIntent.metricIds,
		metricNames: classifiedIntent.metricNames,
		memberId: input.familyMemberId ?? input.knowledge.familyMember.id,
		maxDepth: 2,
		maxEntities: 32,
	})

	const selection = selectToolForIntent({
		intent: classifiedIntent.intent,
		domain: 'health',
		metricIds: classifiedIntent.metricIds,
		metricNames: classifiedIntent.metricNames,
		timeRangeYears: classifiedIntent.timeRangeYears,
		categoryId: hasScope ? undefined : resolvedCategoryId,
		reportId: input.reportId,
		reportIds: input.reportIds,
	})

	const toolContext = createToolContext({
		userId: input.userId,
		familyMemberId: input.familyMemberId,
		accountOwnerMemberId: input.accountOwnerMemberId,
		memberName: input.memberName,
		question: input.question,
		intent: classifiedIntent.intent,
		knowledge: input.knowledge,
		metricIds: classifiedIntent.metricIds,
		metricNames: classifiedIntent.metricNames,
		timeRangeYears: classifiedIntent.timeRangeYears,
		categoryId: resolvedCategoryId,
		reportId: input.reportId,
		reportIds: input.reportIds,
		signal: input.signal,
	})

	const toolResult = await defaultToolExecutor.execute<HealthToolPayload>(
		selection.toolName,
		toolContext,
		selection.input,
	)

	const toolEvidence = toolResultToEvidence({
		result: toolResult,
		classifiedIntent,
		question: input.question,
		toolName: selection.toolName,
	})

	const evidence = mergeGraphAndToolEvidence({
		graphContext,
		classifiedIntent,
		question: input.question,
		toolItems: toolEvidence.items,
		excludedFromTool: toolEvidence.metadata.excludedItems,
	})

	recordEvidenceSelection({
		intent: classifiedIntent.intent,
		metadata: evidence.metadata,
	})

	return {
		classifiedIntent,
		evidence,
		selectedTool: selection.toolName,
		toolResult,
		graphContext,
	}
}

export function resolveDomainClassifier(domain: KnowledgeDomainId) {
	if (domain === 'health') {
		return healthIntentClassifier
	}

	return null
}
