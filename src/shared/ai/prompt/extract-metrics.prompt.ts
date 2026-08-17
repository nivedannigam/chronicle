import type { ExtractMetricsAiEdgeMetric } from '@/shared/ai/transport/extract-metrics.types'
import { normalizeExtractMetricsModelMetrics } from '@/shared/ai/prompt/extract-metrics-normalizer'
import { EXTRACT_METRICS_CHUNK_SIZE } from '@/shared/ai/prompt/extract-metrics-chunking'

export { EXTRACT_METRICS_CHUNK_SIZE as EXTRACT_METRICS_MAX_OCR_CHARS }

const SYSTEM_PROMPT = `You extract structured laboratory metrics from OCR text of medical lab reports.
Return ONLY valid JSON. Do not invent values that are not supported by the text.
Use ISO dates (YYYY-MM-DD) when inferring reportDate.
Extract every laboratory test row you can find — do not stop after the first section.
If no laboratory metrics are present, return {"metrics":[],"warnings":["no_metrics_found"]}.`

export function buildExtractMetricsPrompt(input: {
	extractedText: string
	fileName: string
	chunkIndex?: number
	chunkTotal?: number
}): Array<{ role: string; content: string }> {
	const trimmedText = input.extractedText
		.trim()
		.slice(0, EXTRACT_METRICS_CHUNK_SIZE)
	const chunkLabel =
		input.chunkTotal != null && input.chunkTotal > 1
			? `OCR text (part ${(input.chunkIndex ?? 0) + 1} of ${input.chunkTotal}):`
			: 'OCR text:'

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
				chunkLabel,
				trimmedText,
			].join('\n\n'),
		},
	]
}

export function buildExtractMetricsDirectPrompt(input: {
	fileName: string
}): Array<{ role: string; content: string }> {
	return [
		{
			role: 'system',
			content: `${SYSTEM_PROMPT}
Read the attached medical report document directly. Do not rely on OCR text.`,
		},
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
				'Read the attached document and extract all laboratory metrics you can find.',
			].join('\n\n'),
		},
	]
}

export function parseExtractMetricsModelJson(raw: string): {
	metrics: ExtractMetricsAiEdgeMetric[]
	metadata: {
		laboratory?: string | null
		reportDate?: string | null
		patientName?: string | null
		reportType?: string | null
	}
	warnings: string[]
} {
	const trimmed = raw.trim()

	if (!trimmed) {
		return {
			metrics: [],
			metadata: {},
			warnings: ['empty_model_response'],
		}
	}

	const cleaned = trimmed
		.replace(/^```json\s*/i, '')
		.replace(/^```\s*/i, '')
		.replace(/\s*```$/i, '')

	let parsed: unknown

	try {
		parsed = JSON.parse(cleaned)
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Invalid JSON from model'
		throw new Error(`AI metric extraction returned invalid JSON: ${message}`)
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('AI metric extraction returned an unexpected JSON shape')
	}

	const record = parsed as Record<string, unknown>

	return {
		metrics: normalizeExtractMetricsModelMetrics(record.metrics),
		metadata:
			record.metadata && typeof record.metadata === 'object'
				? (record.metadata as {
						laboratory?: string | null
						reportDate?: string | null
						patientName?: string | null
						reportType?: string | null
					})
				: {},
		warnings: Array.isArray(record.warnings)
			? record.warnings.filter(
					(item): item is string => typeof item === 'string',
				)
			: [],
	}
}
