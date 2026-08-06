import { GEMINI_MODEL } from '../ask-ai/constants.ts'
import { callGemini } from '../ask-ai/gemini.ts'
import { buildExtractMetricsPrompt } from '../_shared/extract-metrics-prompt.ts'
import type { ExtractMetricsAiRequestBody } from './types.ts'

export async function callExtractMetricsGemini(input: {
	correlationId: string
	body: ExtractMetricsAiRequestBody
}) {
	const model = input.body.model?.trim() || GEMINI_MODEL
	const messages = buildExtractMetricsPrompt({
		extractedText: input.body.extractedText,
		fileName: input.body.fileName,
	})

	return callGemini({
		correlationId: input.correlationId,
		body: {
			provider: 'gemini',
			model,
			messages,
			responseFormat: 'json',
			temperature: 0.1,
			maxTokens: 4096,
		},
		mode: 'complete',
	})
}

export { GEMINI_MODEL }
