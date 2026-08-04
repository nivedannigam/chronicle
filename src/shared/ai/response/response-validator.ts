import { z } from 'zod'
import { normalizeCompanionResponse } from '@/shared/ai/response/companion-response.normalizer'
import type {
	GroundedValidationContext,
	GroundedValidationResult,
	OverallHealthStatus,
	StructuredAIResponse,
	ValidateStructuredResponseResult,
} from '@/shared/ai/types/structured-response.types'

const evidenceReferenceSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	sourceType: z.string().min(1),
})

export const structuredAIResponseSchema = z
	.object({
		summary: z.string().min(1).optional(),
		directAnswer: z.string().min(1).optional(),
		overallStatus: z.enum([
			'stable',
			'needs_attention',
			'critical',
			'insufficient_data',
		]),
		keyFindings: z.array(z.string()).optional(),
		evidenceFromReports: z.array(z.string()).optional(),
		whatChanged: z.array(z.string()).optional(),
		whatItMayMean: z.array(z.string()).optional(),
		doctorDiscussion: z.array(z.string()).optional(),
		confidenceLevel: z.enum(['high', 'medium', 'low']).optional(),
		sourceReports: z.array(evidenceReferenceSchema).optional(),
		recommendations: z.array(z.string()).default([]),
		followUpQuestions: z.array(z.string()).default([]),
		confidence: z.number().min(0).max(1).default(0.75),
		limitations: z.array(z.string()).default([]),
		evidenceReferences: z.array(evidenceReferenceSchema).default([]),
		evidence: z.array(z.any()).optional(),
	})
	.refine(
		(value) => Boolean(value.summary?.trim() || value.directAnswer?.trim()),
		{
			message: 'summary or directAnswer is required',
			path: ['summary'],
		},
	)

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function coerceOverallStatus(value: unknown): OverallHealthStatus {
	const allowed: OverallHealthStatus[] = [
		'stable',
		'needs_attention',
		'critical',
		'insufficient_data',
	]

	if (
		typeof value === 'string' &&
		allowed.includes(value as OverallHealthStatus)
	) {
		return value as OverallHealthStatus
	}

	if (typeof value === 'string') {
		const normalized = value.toLowerCase()

		if (normalized.includes('critical') || normalized.includes('urgent')) {
			return 'critical'
		}

		if (
			normalized.includes('attention') ||
			normalized.includes('concern') ||
			normalized.includes('warning')
		) {
			return 'needs_attention'
		}

		if (normalized.includes('insufficient') || normalized.includes('missing')) {
			return 'insufficient_data'
		}

		if (
			normalized.includes('stable') ||
			normalized.includes('normal') ||
			normalized.includes('completed') ||
			normalized.includes('good')
		) {
			return 'stable'
		}
	}

	return 'stable'
}

function coerceConfidence(input: Record<string, unknown>): number {
	if (typeof input.confidence === 'number' && !Number.isNaN(input.confidence)) {
		return Math.min(1, Math.max(0, input.confidence))
	}

	switch (input.confidenceLevel) {
		case 'high':
			return 0.85
		case 'low':
			return 0.55
		case 'medium':
			return 0.75
		default:
			return 0.75
	}
}

function coerceEvidenceReference(
	raw: unknown,
	defaultSourceType: string,
): z.infer<typeof evidenceReferenceSchema> | null {
	if (!isRecord(raw)) {
		return null
	}

	const id = typeof raw.id === 'string' ? raw.id.trim() : ''
	const label =
		typeof raw.label === 'string'
			? raw.label.trim()
			: typeof raw.title === 'string'
				? raw.title.trim()
				: ''

	if (!id || !label) {
		return null
	}

	const sourceType =
		typeof raw.sourceType === 'string' && raw.sourceType.trim().length > 0
			? raw.sourceType.trim()
			: defaultSourceType

	return { id, label, sourceType }
}

/** Normalizes common Gemini drift before schema validation. */
export function coerceStructuredResponseInput(input: unknown): unknown {
	if (!isRecord(input)) {
		return input
	}

	const sourceReports = (
		Array.isArray(input.sourceReports) ? input.sourceReports : []
	)
		.map((item) => coerceEvidenceReference(item, 'health_report'))
		.filter(
			(item): item is z.infer<typeof evidenceReferenceSchema> => item != null,
		)

	const evidenceReferences = (
		Array.isArray(input.evidenceReferences) ? input.evidenceReferences : []
	)
		.map((item) => coerceEvidenceReference(item, 'health_metric'))
		.filter(
			(item): item is z.infer<typeof evidenceReferenceSchema> => item != null,
		)

	const resolvedEvidenceReferences =
		evidenceReferences.length > 0 ? evidenceReferences : sourceReports

	const directAnswer =
		typeof input.directAnswer === 'string'
			? input.directAnswer
			: typeof input.summary === 'string'
				? input.summary
				: undefined

	return {
		...input,
		summary:
			typeof input.summary === 'string' && input.summary.trim().length > 0
				? input.summary
				: directAnswer,
		directAnswer,
		overallStatus: coerceOverallStatus(input.overallStatus),
		keyFindings: Array.isArray(input.keyFindings)
			? input.keyFindings
			: undefined,
		evidenceFromReports: Array.isArray(input.evidenceFromReports)
			? input.evidenceFromReports
			: undefined,
		whatChanged: Array.isArray(input.whatChanged)
			? input.whatChanged
			: undefined,
		whatItMayMean: Array.isArray(input.whatItMayMean)
			? input.whatItMayMean
			: undefined,
		doctorDiscussion: Array.isArray(input.doctorDiscussion)
			? input.doctorDiscussion
			: undefined,
		recommendations: Array.isArray(input.recommendations)
			? input.recommendations
			: [],
		followUpQuestions: Array.isArray(input.followUpQuestions)
			? input.followUpQuestions
			: [],
		confidence: coerceConfidence(input),
		limitations: Array.isArray(input.limitations) ? input.limitations : [],
		sourceReports,
		evidenceReferences: resolvedEvidenceReferences,
	}
}

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
	const coerced = coerceStructuredResponseInput(input)
	const parsed = structuredAIResponseSchema.safeParse(coerced)

	if (!parsed.success) {
		return {
			ok: false,
			errors: parsed.error.issues.map(
				(issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
			),
			raw: input,
		}
	}

	const value = normalizeCompanionResponse({
		...parsed.data,
		summary: parsed.data.summary ?? parsed.data.directAnswer ?? '',
		keyFindings:
			parsed.data.keyFindings ?? parsed.data.evidenceFromReports ?? [],
		evidenceReferences: parsed.data.evidenceReferences ?? [],
	} as StructuredAIResponse)

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
		const known =
			context.allowedEvidenceIds.has(ref.id) ||
			context.allowedReportIds.has(ref.id)

		if (!known) {
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
