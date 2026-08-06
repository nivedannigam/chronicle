import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'

/** LLM-safe subset of HealthKnowledge — no OCR, no raw DB rows. */
export interface HealthKnowledgeLLMContext {
	patient: { userId: string }
	familyMember: {
		displayName: string
		relationship: string
	}
	latestReport: {
		id: string
		title: string
		date: string
		lab: string
		metricCount: number
		badgeStatus: string
	} | null
	abnormalMetrics: Array<{
		id: string
		displayName: string
		value: string
		unit: string | null
		status: string
		referenceRange: string
		confidence: number
		source: string
		reportId: string
	}>
	importantMetrics: Array<{
		id: string
		displayName: string
		value: string
		unit: string | null
		status: string
		priority: string
		reportId: string
	}>
	trendSummary: Array<{
		metricId: string
		displayName: string
		direction: string
		changePercent: number | null
		isActionable: boolean
	}>
	recommendations: Array<{ id: string; text: string; priority: string }>
	confidence: {
		overall: number
		dataCompleteness: number
		parserConfidence: number | null
	}
	limitations: Array<{ code: string; message: string; severity: string }>
	evidence: Array<{ id: string; type: string; label: string; date?: string }>
	summary: {
		headline: string
		lines: string[]
		metricCount: number
		abnormalCount: number
		criticalCount: number
	}
}

export function serializeHealthKnowledgeForLLM(
	knowledge: HealthKnowledge,
): HealthKnowledgeLLMContext {
	const importantMetrics = knowledge.metrics
		.filter(
			(metric) =>
				metric.priority === 'critical' ||
				metric.priority === 'high' ||
				metric.status !== 'normal',
		)
		.slice(0, 12)
		.map((metric) => ({
			id: metric.id,
			displayName: metric.displayName,
			value: metric.value,
			unit: metric.unit,
			status: metric.status,
			priority: metric.priority,
			reportId: metric.reportId,
		}))

	return {
		patient: { userId: knowledge.patient.userId },
		familyMember: {
			displayName: knowledge.familyMember.displayName,
			relationship: knowledge.familyMember.relationship,
		},
		latestReport: knowledge.latestReport
			? {
					id: knowledge.latestReport.id,
					title: knowledge.latestReport.title,
					date: knowledge.latestReport.date,
					lab: knowledge.latestReport.lab,
					metricCount: knowledge.latestReport.metricCount,
					badgeStatus: knowledge.latestReport.badgeStatus,
				}
			: null,
		abnormalMetrics: knowledge.abnormalMetrics.slice(0, 12).map((metric) => ({
			id: metric.id,
			displayName: metric.displayName,
			value: metric.value,
			unit: metric.unit,
			status: metric.status,
			referenceRange: metric.referenceRange,
			confidence: metric.confidence,
			source: metric.source,
			reportId: metric.reportId,
		})),
		importantMetrics,
		trendSummary: knowledge.trendAnalysis.slice(0, 8).map((trend) => ({
			metricId: trend.metricId,
			displayName: trend.displayName,
			direction: trend.direction,
			changePercent: trend.changePercent,
			isActionable: trend.isActionable,
		})),
		recommendations: knowledge.recommendations.slice(0, 6).map((item) => ({
			id: item.id,
			text: item.text,
			priority: item.priority,
		})),
		confidence: {
			overall: knowledge.confidence.overall,
			dataCompleteness: knowledge.confidence.dataCompleteness,
			parserConfidence: knowledge.confidence.parserConfidence,
		},
		limitations: knowledge.limitations.map((item) => ({
			code: item.code,
			message: item.message,
			severity: item.severity,
		})),
		evidence: knowledge.sources.slice(0, 20).map((source) => ({
			id: source.id,
			type: source.type,
			label: source.label,
			date: source.date,
		})),
		summary: {
			headline: knowledge.summary.headline,
			lines: knowledge.summary.lines,
			metricCount: knowledge.summary.metricCount,
			abnormalCount: knowledge.summary.abnormalCount,
			criticalCount: knowledge.summary.criticalCount,
		},
	}
}

const FORBIDDEN_LLM_KEYS = new Set([
	'extracted_text',
	'parsed_data',
	'storage_path',
	'ocr_page_count',
	'ocr_confidence',
	'ocr_provider',
	'ocr_metadata',
	'ocr_processing_time_ms',
	'rawtext',
	'ocrconfidence',
	'ocrprovider',
	'ocrprocessingtimems',
	'ocrmetadata',
	'ocrpagecount',
])

function normalizeForbiddenKey(key: string): string {
	return key.replace(/[-_\s]/g, '').toLowerCase()
}

export function isForbiddenLLMKey(key: string): boolean {
	const normalized = normalizeForbiddenKey(key)

	if (FORBIDDEN_LLM_KEYS.has(normalized)) {
		return true
	}

	if (normalized.startsWith('ocr')) {
		return true
	}

	return (
		normalized.includes('extractedtext') ||
		normalized.includes('parseddata') ||
		normalized.includes('storagepath')
	)
}

function findForbiddenKeyPath(
	value: unknown,
	path: string[] = [],
): string | null {
	if (value === null || typeof value !== 'object') {
		return null
	}

	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			const found = findForbiddenKeyPath(value[index], [...path, String(index)])

			if (found) {
				return found
			}
		}

		return null
	}

	for (const [key, child] of Object.entries(value)) {
		if (isForbiddenLLMKey(key)) {
			return [...path, key].join('.')
		}

		const found = findForbiddenKeyPath(child, [...path, key])

		if (found) {
			return found
		}
	}

	return null
}

/** Walk structured prompt payloads and reject raw OCR / DB field names. */
export function assertNoForbiddenLLMKeys(value: unknown): void {
	const forbiddenPath = findForbiddenKeyPath(value)

	if (forbiddenPath) {
		throw new Error(`Prompt payload contains forbidden field: ${forbiddenPath}`)
	}
}

const EVIDENCE_BUNDLE_JSON_MARKER =
	'EvidenceBundle (use ONLY this structured data — do not invent values):'

function extractEvidenceBundleJson(payload: string): unknown | null {
	const markerIndex = payload.indexOf(EVIDENCE_BUNDLE_JSON_MARKER)

	if (markerIndex < 0) {
		return null
	}

	const jsonText = payload
		.slice(markerIndex + EVIDENCE_BUNDLE_JSON_MARKER.length)
		.trim()

	if (!jsonText) {
		return null
	}

	try {
		return JSON.parse(jsonText)
	} catch {
		return null
	}
}

/** Validates structured evidence keys; allows OCR wording inside user-facing values. */
export function assertNoForbiddenLLMFields(payload: string): void {
	const evidencePayload = extractEvidenceBundleJson(payload)

	if (evidencePayload != null) {
		assertNoForbiddenLLMKeys(evidencePayload)
	}
}
