import { estimateEvidenceTokens } from '@/shared/ai/evidence/token-estimator'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type {
	HealthToolPayload,
	ToolResult,
} from '@/shared/ai/tools/tool.types'

export function toolResultToEvidence(input: {
	result: ToolResult<HealthToolPayload>
	classifiedIntent: ClassifiedIntent
	question: string
	toolName: string
}): SelectedEvidence {
	const payload = input.result.data ?? {
		items: [],
		excluded: [],
		confidence: input.result.confidence,
	}

	const evidencePayload = {
		tool: input.toolName,
		intent: input.classifiedIntent.intent,
		familyMember: {
			displayName: input.result.domain,
		},
		evidence: payload.items,
	}

	const contextSizeChars = JSON.stringify(evidencePayload).length

	return {
		domain: 'health',
		intent: input.classifiedIntent.intent,
		question: input.question,
		items: payload.items,
		metadata: {
			evidenceCount: payload.items.length,
			excludedItems: payload.excluded,
			estimatedTokens: estimateEvidenceTokens({
				payload: evidencePayload,
				question: input.question,
			}),
			contextSizeChars,
			selectedKeys: payload.items.map((item) => item.id),
		},
	}
}

export function isHealthToolPayload(
	value: unknown,
): value is HealthToolPayload {
	if (!value || typeof value !== 'object') {
		return false
	}

	return Array.isArray((value as HealthToolPayload).items)
}
