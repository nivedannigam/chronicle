import type { ConversationTurnMemory } from '@/features/ask/memory/conversation-memory'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { AiMessage } from '@/features/ai/types'

export interface BuiltPrompt {
	system: string
	user: string
	messages: AiMessage[]
	contextJson: string
}

const CHRONICLE_SYSTEM_PROMPT = `
You are Chronicle — the intelligence layer of a family's personal operating system.

Your role is to explain, connect, and summarize information the family has already entrusted to Chronicle.
You are NOT a generic chatbot. You do NOT browse the internet. You do NOT invent facts.

SOURCE OF TRUTH:
- Use ONLY the structured knowledge context provided in the user message.
- The knowledge graph is the product. Your words organize what is already known.
- If information is missing, say clearly: "I don't have that in your Chronicle records yet."

VOICE:
- Personal, calm, and precise — like a trusted family advisor.
- Refer to the selected family member when relevant.
- Prefer phrases like "In your records…", "Based on what Chronicle knows…", "From your report on…"

MEDICAL SAFETY (when health records are in context):
- Never diagnose or prescribe.
- Encourage discussing significant findings with a healthcare professional.
- End health-related answers with: "This is informational and not medical advice."

OUTPUT:
Return valid JSON only with keys: answer, confidence, citations.
Each citation must reference a reportId that exists in the context when citing reports.
`.trim()

export class PromptBuilder {
	build(input: {
		question: string
		knowledge: RetrievedKnowledge | null
		contextJson?: string
		memory: ConversationTurnMemory[]
		member: IntelligenceMemberContext
		dataAvailable: boolean
	}): BuiltPrompt {
		const contextJson =
			input.contextJson ??
			JSON.stringify(
				{
					selectedMember: input.member.memberName,
					domain: input.knowledge?.domain,
					intent: input.knowledge?.intent,
					dataAvailable: input.dataAvailable,
					reports: input.knowledge?.reports ?? [],
					metrics: input.knowledge?.metrics ?? [],
					timelines: input.knowledge?.timelines ?? [],
					trends: input.knowledge?.trends ?? [],
					observations: input.knowledge?.observations.slice(0, 40) ?? [],
					relationships: input.knowledge?.relationships ?? [],
					insights: input.knowledge?.insights ?? [],
					alerts: input.knowledge?.alerts ?? [],
					summaryLines: input.knowledge?.summaryLines ?? [],
				},
				null,
				2,
			)

		const history = input.memory
			.slice(-4)
			.map(
				(turn) =>
					`User: ${turn.question}\nChronicle: ${turn.answer.slice(0, 400)}`,
			)
			.join('\n\n')

		const system = `${CHRONICLE_SYSTEM_PROMPT}

Output JSON schema:
{
  "answer": "string",
  "confidence": "high" | "medium" | "low",
  "citations": [{
    "reportId": "string",
    "reportTitle": "string",
    "metricName": "string optional",
    "hospital": "string optional",
    "date": "string optional",
    "timelineRef": "string optional"
  }]
}`

		const user = [
			input.member.memberName
				? `Selected family member: ${input.member.memberName}`
				: 'Selected family member: account owner',
			'Structured Chronicle knowledge (ONLY source of truth):',
			contextJson,
			history ? `\nRecent conversation:\n${history}` : '',
			`\nQuestion:\n${input.question}`,
			input.dataAvailable
				? '\nAnswer using only the knowledge above.'
				: '\nNo matching records were found. Explain what is missing and what capability would answer this in the future.',
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
