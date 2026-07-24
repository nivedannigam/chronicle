import type { AiMessage } from '@/features/ai/types'
import type { ConversationTurnMemory } from '@/features/ask/memory/conversation-memory'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

export interface BuiltPrompt {
	system: string
	user: string
	messages: AiMessage[]
	contextJson: string
}

const SAFETY_RULES = `
You are Ask Chronicle, a health information assistant.

STRICT RULES:
- Answer ONLY using the structured knowledge context provided below.
- NEVER use raw PDF text or invent data not present in the context.
- NEVER diagnose conditions or prescribe medication.
- Use phrasing such as "Based on your reports..." and "Discuss these findings with your healthcare professional."
- Always include: "This is informational and not medical advice."
- If the context is insufficient, say you do not have enough structured data.
- Return valid JSON with keys: answer, confidence, citations, cards.
`.trim()

export class PromptBuilder {
	build(input: {
		question: string
		knowledge: RetrievedKnowledge
		memory: ConversationTurnMemory[]
	}): BuiltPrompt {
		const contextJson = JSON.stringify(
			{
				domain: input.knowledge.domain,
				intent: input.knowledge.intent,
				reports: input.knowledge.reports,
				metrics: input.knowledge.metrics,
				timelines: input.knowledge.timelines,
				trends: input.knowledge.trends,
				observations: input.knowledge.observations.slice(0, 40),
				relationships: input.knowledge.relationships,
				insights: input.knowledge.insights,
				alerts: input.knowledge.alerts,
				summaryLines: input.knowledge.summaryLines,
			},
			null,
			2,
		)

		const history = input.memory
			.slice(-4)
			.map(
				(turn) =>
					`User: ${turn.question}\nAssistant: ${turn.answer.slice(0, 400)}`,
			)
			.join('\n\n')

		const system = `${SAFETY_RULES}

Output JSON schema:
{
  "answer": "string",
  "confidence": 0.0-1.0,
  "citations": [{ "reportId": "string", "reportTitle": "string", "metricName": "string" }],
  "cards": [{ "type": "summary|metric|trend|timeline|report|comparison|alert", "...": "..." }]
}`

		const user = [
			'Structured knowledge context (ONLY source of truth):',
			contextJson,
			history ? `\nConversation history:\n${history}` : '',
			`\nCurrent question:\n${input.question}`,
			'\nRespond with grounded JSON only.',
		]
			.filter(Boolean)
			.join('\n')

		return {
			system,
			user,
			contextJson,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user },
			],
		}
	}
}

export const promptBuilder = new PromptBuilder()
