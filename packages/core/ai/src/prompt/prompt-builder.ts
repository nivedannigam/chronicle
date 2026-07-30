import type { AiMessage } from '../types/ai.types.ts'
import {
	CHRONICLE_BASE_SYSTEM_PROMPT,
	CHRONICLE_OUTPUT_JSON_SCHEMA,
} from './chronicle-base-prompt.ts'
import { getApplicablePromptExtensions } from './prompt-extension.registry.ts'
import type { BuiltPrompt, PromptBuildInput } from './prompt.types.ts'

export class PromptBuilder {
	build(input: PromptBuildInput): BuiltPrompt {
		const applicableExtensions = getApplicablePromptExtensions(input)
		const extensionSections = applicableExtensions.flatMap(
			(extension) => extension.systemPromptSections ?? [],
		)
		const schemaAdditions = applicableExtensions
			.map((extension) => extension.outputSchemaAdditions)
			.filter(Boolean)
			.join('\n')

		const history = input.conversationHistory
			.slice(-4)
			.map(
				(turn) =>
					`User: ${turn.question}\nChronicle: ${turn.answer.slice(0, 400)}`,
			)
			.join('\n\n')

		const personalization = input.personalizationInstructions
			? `PERSONALIZATION:\n- ${input.personalizationInstructions}`
			: ''

		const system = [
			CHRONICLE_BASE_SYSTEM_PROMPT,
			...extensionSections,
			personalization,
			'PERSONALIZATION:',
			'- Always answer for the selected family member unless the question explicitly names someone else.',
			'- Use conversation history to resolve follow-up questions without asking the user to repeat context.',
			CHRONICLE_OUTPUT_JSON_SCHEMA,
			schemaAdditions,
		]
			.filter(Boolean)
			.join('\n\n')

		const user = [
			input.memberName
				? `Selected family member: ${input.memberName}`
				: 'Selected family member: account owner',
			'Structured Chronicle knowledge (ONLY source of truth):',
			input.contextJson,
			history ? `\nRecent conversation:\n${history}` : '',
			`\nQuestion:\n${input.question}`,
			input.dataAvailable
				? '\nAnswer using only the knowledge above.'
				: '\nNo matching records were found. Explain what is missing and what capability would answer this in the future.',
		]
			.filter(Boolean)
			.join('\n')

		const messages: AiMessage[] = [
			{ role: 'system', content: system },
			{ role: 'user', content: user },
		]

		return {
			system,
			user,
			contextJson: input.contextJson,
			messages,
		}
	}
}

export const promptBuilder = new PromptBuilder()
