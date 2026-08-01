import {
	CHRONICLE_DEVELOPER_PROMPT,
	CHRONICLE_SYSTEM_PROMPT,
	STRUCTURED_OUTPUT_SCHEMA_DESCRIPTION,
} from '@/shared/ai/prompt/prompt-templates'
import type { BuiltPrompt, PromptContext } from '@/shared/ai/types/prompt.types'

function formatEvidence(context: PromptContext): string {
	if (context.knowledge.evidence.length === 0) {
		return 'No structured evidence items were attached.'
	}

	return context.knowledge.evidence
		.slice(0, 12)
		.map(
			(item, index) =>
				`${index + 1}. [${item.sourceType}] ${item.label}${item.excerpt ? ` — ${item.excerpt}` : ''}`,
		)
		.join('\n')
}

function formatContext(context: PromptContext): string {
	const lines = [
		`Domain: ${context.knowledge.domain}`,
		`Intent: ${context.intent}`,
		`Data available: ${context.knowledge.dataAvailable ? 'yes' : 'no'}`,
		`Reports: ${context.knowledge.reports.length}`,
		`Metrics: ${context.knowledge.metrics.length}`,
	]

	if (context.memberName) {
		lines.push(`Member: ${context.memberName}`)
	}

	if (context.knowledge.coverageNotes.length > 0) {
		lines.push(`Coverage notes: ${context.knowledge.coverageNotes.join(' | ')}`)
	}

	if (context.knowledge.summaryLines.length > 0) {
		lines.push(
			`Summary lines:\n- ${context.knowledge.summaryLines.join('\n- ')}`,
		)
	}

	if (context.knowledge.insights.length > 0) {
		lines.push(`Insights:\n- ${context.knowledge.insights.join('\n- ')}`)
	}

	if (context.additionalInstructions?.length) {
		lines.push(
			`Additional instructions:\n- ${context.additionalInstructions.join('\n- ')}`,
		)
	}

	return lines.join('\n')
}

export function buildPlatformPrompt(context: PromptContext): BuiltPrompt {
	const evidence = formatEvidence(context)
	const contextBlock = formatContext(context)
	const outputSchema = STRUCTURED_OUTPUT_SCHEMA_DESCRIPTION
	const user = [
		`Question: ${context.question}`,
		'',
		'Use the evidence and context below.',
	].join('\n')

	const messages = [
		{ role: 'system' as const, content: CHRONICLE_SYSTEM_PROMPT },
		{ role: 'developer' as const, content: CHRONICLE_DEVELOPER_PROMPT },
		{
			role: 'user' as const,
			content: [
				user,
				'',
				'Context:',
				contextBlock,
				'',
				'Evidence:',
				evidence,
			].join('\n'),
		},
	]

	return {
		system: CHRONICLE_SYSTEM_PROMPT,
		developer: CHRONICLE_DEVELOPER_PROMPT,
		user,
		evidence,
		context: contextBlock,
		outputSchema,
		messages,
	}
}
