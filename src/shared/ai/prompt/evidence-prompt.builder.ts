import {
	CHRONICLE_HEALTH_DEVELOPER_PROMPT,
	CHRONICLE_HEALTH_SYSTEM_PROMPT,
	HEALTH_SUMMARIZE_OUTPUT_SCHEMA,
} from '@/shared/ai/prompt/prompt-templates'
import { assertNoForbiddenLLMFields } from '@/shared/ai/knowledge/health-knowledge-serializer'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { BuiltPrompt } from '@/shared/ai/types/prompt.types'

export interface EvidencePromptInput {
	question: string
	intent: ClassifiedIntent
	evidence: SelectedEvidence
	memberName?: string | null
	memoryContextPrompt?: string | null
}

/**
 * Prompt builder — receives ONLY question, intent, and selected evidence.
 * Never accesses HealthKnowledge or database tables.
 */
export function buildEvidencePrompt(input: EvidencePromptInput): BuiltPrompt {
	const evidencePayload = {
		intent: input.intent.intent,
		intentConfidence: input.intent.confidence,
		intentReasons: input.intent.reasons,
		evidence: input.evidence.items.map((item) => ({
			id: item.id,
			type: item.type,
			label: item.label,
			data: item.data,
		})),
		selection: {
			evidenceCount: input.evidence.metadata.evidenceCount,
			excludedItems: input.evidence.metadata.excludedItems,
			estimatedTokens: input.evidence.metadata.estimatedTokens,
		},
	}

	const evidenceJson = JSON.stringify(evidencePayload, null, 2)
	const user = [
		`Question: ${input.question}`,
		input.memberName ? `Member: ${input.memberName}` : '',
		`Intent: ${input.intent.intent}`,
		input.memoryContextPrompt ? '' : '',
		input.memoryContextPrompt ?? '',
		'',
		'SelectedEvidence (use ONLY this data — do not invent values):',
		evidenceJson,
	]
		.filter((line, index, array) => !(line === '' && array[index - 1] === ''))
		.join('\n')

	assertNoForbiddenLLMFields(user)

	const developerPrompt = [
		CHRONICLE_HEALTH_DEVELOPER_PROMPT,
		`Respond to intent ${input.intent.intent} using only SelectedEvidence.`,
	].join('\n')

	const messages = [
		{ role: 'system' as const, content: CHRONICLE_HEALTH_SYSTEM_PROMPT },
		{ role: 'developer' as const, content: developerPrompt },
		{ role: 'user' as const, content: user },
	]

	return {
		system: CHRONICLE_HEALTH_SYSTEM_PROMPT,
		developer: developerPrompt,
		user,
		evidence: input.evidence.items
			.map((item) => `${item.id}: ${item.label}`)
			.join('\n'),
		context: `Intent=${input.intent.intent}; evidence=${input.evidence.metadata.evidenceCount}`,
		outputSchema: HEALTH_SUMMARIZE_OUTPUT_SCHEMA,
		messages,
	}
}
