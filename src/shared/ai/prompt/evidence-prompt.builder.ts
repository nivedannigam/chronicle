import {
	CHRONICLE_HEALTH_DEVELOPER_PROMPT,
	CHRONICLE_HEALTH_SYSTEM_PROMPT,
	HEALTH_SUMMARIZE_OUTPUT_SCHEMA,
} from '@/shared/ai/prompt/prompt-templates'
import { assertNoForbiddenLLMFields } from '@/shared/ai/knowledge/health-knowledge-serializer'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { BuiltPrompt } from '@/shared/ai/types/prompt.types'

export interface EvidencePromptInput {
	question: string
	intent: ClassifiedIntent
	evidence: SelectedEvidence
	evidenceBundle: EvidenceBundle
	memberName?: string | null
	memoryContextPrompt?: string | null
}

/**
 * Prompt builder — structured EvidenceBundle context only.
 * Gemini writes every narrative answer; Chronicle does not synthesize summaries here.
 */
export function buildEvidencePrompt(input: EvidencePromptInput): BuiltPrompt {
	const evidencePayload = {
		questionType: input.evidenceBundle.metadata.questionType,
		intent: input.intent.intent,
		intentConfidence: input.intent.confidence,
		intentReasons: input.intent.reasons,
		evidenceBundle: {
			reports: input.evidenceBundle.reports,
			metrics: input.evidenceBundle.metrics,
			trends: input.evidenceBundle.trends,
			timeline: input.evidenceBundle.timeline,
			summary: {
				healthScore: input.evidenceBundle.summary.healthScore,
				limitations: input.evidenceBundle.summary.limitations,
			},
		},
		groundedReferences: input.evidence.items.map((item) => ({
			id: item.id,
			type: item.type,
			label: item.label,
		})),
		selection: {
			evidenceCount: input.evidence.metadata.evidenceCount,
			excludedItems: input.evidence.metadata.excludedItems,
			estimatedTokens: input.evidence.metadata.estimatedTokens,
			resolver: input.evidenceBundle.metadata.resolver,
		},
	}

	const evidenceJson = JSON.stringify(evidencePayload, null, 2)
	const user = [
		`Question: ${input.question}`,
		input.memberName ? `Member: ${input.memberName}` : '',
		`Intent: ${input.intent.intent}`,
		input.memoryContextPrompt ?? '',
		'',
		'EvidenceBundle (use ONLY this structured data — do not invent values):',
		evidenceJson,
	]
		.filter((line, index, array) => !(line === '' && array[index - 1] === ''))
		.join('\n')

	assertNoForbiddenLLMFields(user)

	const developerPrompt = [
		CHRONICLE_HEALTH_DEVELOPER_PROMPT,
		`Respond to intent ${input.intent.intent} using only EvidenceBundle and groundedReferences.`,
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
		context: `QuestionType=${input.evidenceBundle.metadata.questionType}; evidence=${input.evidence.metadata.evidenceCount}`,
		outputSchema: HEALTH_SUMMARIZE_OUTPUT_SCHEMA,
		messages,
	}
}
