import {
	CHRONICLE_HEALTH_DEVELOPER_PROMPT,
	CHRONICLE_HEALTH_SYSTEM_PROMPT,
	HEALTH_SUMMARIZE_OUTPUT_SCHEMA,
} from '@/shared/ai/prompt/prompt-templates'
import type { HealthKnowledgeLLMContext } from '@/shared/ai/knowledge/health-knowledge-serializer'
import type { BuiltPrompt } from '@/shared/ai/types/prompt.types'

export interface HealthSummarizePromptInput {
	question: string
	healthKnowledge: HealthKnowledgeLLMContext
	memberName?: string | null
}

export function buildHealthSummarizePrompt(
	input: HealthSummarizePromptInput,
): BuiltPrompt {
	const knowledgeJson = JSON.stringify(input.healthKnowledge, null, 2)
	const user = [
		`Question: ${input.question}`,
		input.memberName ? `Member: ${input.memberName}` : '',
		'',
		'HealthKnowledge (use ONLY this data):',
		knowledgeJson,
	].join('\n')

	const messages = [
		{ role: 'system' as const, content: CHRONICLE_HEALTH_SYSTEM_PROMPT },
		{ role: 'developer' as const, content: CHRONICLE_HEALTH_DEVELOPER_PROMPT },
		{ role: 'user' as const, content: user },
	]

	return {
		system: CHRONICLE_HEALTH_SYSTEM_PROMPT,
		developer: CHRONICLE_HEALTH_DEVELOPER_PROMPT,
		user,
		evidence: input.healthKnowledge.evidence
			.map((item) => `${item.id}: ${item.label}`)
			.join('\n'),
		context: `Report: ${input.healthKnowledge.latestReport?.title ?? 'none'}`,
		outputSchema: HEALTH_SUMMARIZE_OUTPUT_SCHEMA,
		messages,
	}
}
