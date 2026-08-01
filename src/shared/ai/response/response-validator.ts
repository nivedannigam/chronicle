import { z } from 'zod'
import type {
	GroundedValidationContext,
	GroundedValidationResult,
	StructuredAIResponse,
	ValidateStructuredResponseResult,
} from '@/shared/ai/types/structured-response.types'

const evidenceReferenceSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	sourceType: z.string().min(1),
})

export const structuredAIResponseSchema = z.object({
	summary: z.string().min(1),
	overallStatus: z.enum([
		'stable',
		'needs_attention',
		'critical',
		'insufficient_data',
	]),
	keyFindings: z.array(z.string()),
	recommendations: z.array(z.string()),
	followUpQuestions: z.array(z.string()),
	confidence: z.number().min(0).max(1),
	limitations: z.array(z.string()),
	evidenceReferences: z.array(evidenceReferenceSchema),
	evidence: z.array(z.any()).optional(),
})

export function parseStructuredResponseContent(content: string): unknown {
	const trimmed = content.trim()

	try {
		return JSON.parse(trimmed)
	} catch {
		const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
		if (fenceMatch?.[1]) {
			return JSON.parse(fenceMatch[1].trim())
		}

		throw new Error('Response is not valid JSON')
	}
}

export function validateStructuredResponse(
	input: unknown,
): ValidateStructuredResponseResult {
	const parsed = structuredAIResponseSchema.safeParse(input)

	if (!parsed.success) {
		return {
			ok: false,
			errors: parsed.error.issues.map(
				(issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
			),
			raw: input,
		}
	}

	const value = parsed.data as StructuredAIResponse

	return {
		ok: true,
		value: {
			...value,
			evidenceReferences: value.evidenceReferences ?? [],
		},
	}
}

export function validateStructuredResponseContent(
	content: string,
): ValidateStructuredResponseResult {
	try {
		const parsed = parseStructuredResponseContent(content)
		return validateStructuredResponse(parsed)
	} catch (error) {
		return {
			ok: false,
			errors: [
				error instanceof Error ? error.message : 'Invalid structured response',
			],
			raw: content,
		}
	}
}

function normalizeMetricName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

export function validateGroundedResponse(
	response: StructuredAIResponse,
	context: GroundedValidationContext,
): GroundedValidationResult {
	const errors: string[] = []

	for (const ref of response.evidenceReferences) {
		if (!context.allowedEvidenceIds.has(ref.id)) {
			errors.push(`Unknown evidence reference id: ${ref.id}`)
		}
	}

	for (const finding of response.keyFindings) {
		const normalizedFinding = normalizeMetricName(finding)
		const mentionsKnownMetric = [...context.allowedMetricNames].some((name) =>
			normalizedFinding.includes(normalizeMetricName(name)),
		)

		const isGenericFinding =
			/no abnormal|no critical|report imported|metrics extracted|insufficient|no report|not available/i.test(
				finding,
			)

		if (
			!isGenericFinding &&
			context.allowedMetricNames.size > 0 &&
			/[a-z]{3,}/i.test(finding) &&
			!mentionsKnownMetric &&
			/\d/.test(finding)
		) {
			errors.push(`Possible hallucinated metric in finding: "${finding}"`)
		}
	}

	if (errors.length > 0) {
		return { ok: false, errors }
	}

	return { ok: true, errors: [], value: response }
}

export function assertStructuredResponse(
	content: string,
	context?: GroundedValidationContext,
): StructuredAIResponse {
	const result = validateStructuredResponseContent(content)

	if (!result.ok) {
		throw new Error(
			`Structured response validation failed: ${result.errors.join('; ')}`,
		)
	}

	if (context) {
		const grounded = validateGroundedResponse(result.value, context)

		if (!grounded.ok) {
			throw new Error(
				`Grounded validation failed: ${grounded.errors.join('; ')}`,
			)
		}
	}

	return result.value
}

export function buildGroundedValidationContext(input: {
	metricNames: string[]
	reportIds: string[]
	evidenceIds: string[]
}): GroundedValidationContext {
	return {
		allowedMetricNames: new Set(input.metricNames),
		allowedReportIds: new Set(input.reportIds),
		allowedEvidenceIds: new Set(input.evidenceIds),
	}
}
