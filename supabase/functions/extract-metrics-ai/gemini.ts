import { GEMINI_MODEL } from '../ask-ai/constants.ts'
import {
	buildGeminiRequestUrl,
	callGemini,
	resolveGeminiApiKey,
} from '../ask-ai/gemini.ts'
import type { ExtractMetricsAiRequestBody } from './types.ts'

const MAX_OCR_CHARS = 14_000

const SYSTEM_PROMPT = `You extract structured laboratory metrics from OCR text of medical lab reports.
Return ONLY valid JSON. Do not invent values that are not supported by the text.
Use ISO dates (YYYY-MM-DD) when inferring reportDate.
If no laboratory metrics are present, return {"metrics":[],"warnings":["no_metrics_found"]}.`

export function buildExtractMetricsPrompt(input: {
	extractedText: string
	fileName: string
}): Array<{ role: string; content: string }> {
	const trimmedText = input.extractedText.trim().slice(0, MAX_OCR_CHARS)

	return [
		{ role: 'system', content: SYSTEM_PROMPT },
		{
			role: 'user',
			content: [
				`File name: ${input.fileName}`,
				'Extract laboratory metrics as JSON with this shape:',
				JSON.stringify(
					{
						metrics: [
							{
								rawName: 'HEMOGLOBIN',
								displayName: 'Hemoglobin',
								value: '13.5',
								unit: 'g/dL',
								referenceRange: {
									rawText: '12.0-16.0',
									lowerLimit: 12,
									upperLimit: 16,
									unit: 'g/dL',
								},
								status: 'normal',
							},
						],
						metadata: {
							laboratory: 'Example Lab',
							reportDate: '2026-03-09',
							patientName: null,
							reportType: 'general',
						},
						warnings: [],
					},
					null,
					2,
				),
				'OCR text:',
				trimmedText,
			].join('\n\n'),
		},
	]
}

export async function callExtractMetricsGemini(input: {
	correlationId: string
	body: ExtractMetricsAiRequestBody
}) {
	const apiKey = resolveGeminiApiKey()

	if (!apiKey) {
		throw new Error('GEMINI_API_KEY is not configured on the edge function.')
	}

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

export { buildGeminiRequestUrl, resolveGeminiApiKey, GEMINI_MODEL }
