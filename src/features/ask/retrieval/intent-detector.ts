import type { DetectedIntent } from '@chronicle/core-knowledge'
import { resolveCategoryFromQuery } from '@/features/documents/types/document-categories'

export type IntentDetectionResult = DetectedIntent

const CATEGORY_PATTERNS: Array<{ pattern: RegExp; categoryId: string }> = [
	{ pattern: /\bliver\b|\balt\b|\bast\b|\blft\b/i, categoryId: 'liver' },
	{
		pattern: /\bheart\b|\bldl\b|\bhdl\b|\bcholesterol\b|\blipid\b/i,
		categoryId: 'heart',
	},
	{ pattern: /\bkidney\b|\bcreatinine\b|\begfr\b/i, categoryId: 'kidney' },
	{
		pattern: /\bdiabetes\b|\bhba1c\b|\bglucose\b|\bblood sugar\b/i,
		categoryId: 'diabetes',
	},
	{ pattern: /\bthyroid\b|\btsh\b/i, categoryId: 'thyroid' },
	{
		pattern: /\bvitamin\b|\bvitamin d\b|\bb12\b|\bfolate\b/i,
		categoryId: 'vitamin',
	},
	{
		pattern: /\bblood\b|\bhemoglobin\b|\bwbc\b|\bplatelet\b/i,
		categoryId: 'blood',
	},
]

const METRIC_PATTERNS: Array<{ pattern: RegExp; metricName: string }> = [
	{ pattern: /\bvitamin d\b/i, metricName: 'Vitamin D' },
	{ pattern: /\bb12\b|\bvitamin b12\b/i, metricName: 'Vitamin B12' },
	{ pattern: /\bhba1c\b/i, metricName: 'HbA1c' },
	{ pattern: /\balt\b|\bsgpt\b/i, metricName: 'ALT (SGPT)' },
	{ pattern: /\bast\b|\bsgot\b/i, metricName: 'AST (SGOT)' },
	{ pattern: /\bldl\b/i, metricName: 'LDL' },
	{ pattern: /\bhdl\b/i, metricName: 'HDL' },
	{ pattern: /\bcreatinine\b/i, metricName: 'Creatinine' },
	{ pattern: /\begfr\b/i, metricName: 'eGFR' },
	{
		pattern: /\bfasting glucose\b|\bblood sugar\b/i,
		metricName: 'Fasting Glucose',
	},
]

function detectTimeRange(question: string): number | undefined {
	if (/past three years|last three years|3 years/i.test(question)) {
		return 3
	}

	if (/past two years|last two years|2 years/i.test(question)) {
		return 2
	}

	if (/past year|last year|one year|1 year/i.test(question)) {
		return 1
	}

	return undefined
}

function detectCategory(question: string): string | undefined {
	return CATEGORY_PATTERNS.find((entry) => entry.pattern.test(question))
		?.categoryId
}

function detectMetric(question: string): string | undefined {
	return METRIC_PATTERNS.find((entry) => entry.pattern.test(question))
		?.metricName
}

export function detectIntent(
	question: string,
	previousTopic?: { categoryId?: string; metricName?: string },
): IntentDetectionResult {
	const normalized = question.trim()
	const resolvedCategory =
		detectCategory(normalized) ?? previousTopic?.categoryId
	const resolvedMetric = detectMetric(normalized) ?? previousTopic?.metricName
	const timeRangeYears = detectTimeRange(normalized)

	if (
		/why did you say|what evidence supports|which reports contributed|what information is missing/i.test(
			normalized,
		)
	) {
		return {
			intent: 'explain_response',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.92,
		}
	}

	if (
		/what should i pay attention to|pay attention to|need attention/i.test(
			normalized,
		)
	) {
		return {
			intent: 'attention_summary',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/summarize my health|summary of my health|how is my health overall/i.test(
			normalized,
		)
	) {
		return {
			intent: 'summarize_health',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/since my last report|since last report|what changed since/i.test(
			normalized,
		)
	) {
		return {
			intent: 'since_last_report',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/health journey|my journey|summarize my health|health history/i.test(
			normalized,
		)
	) {
		return {
			intent: 'health_journey',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/resolved|normalized|no longer abnormal|which findings have resolved/i.test(
			normalized,
		)
	) {
		return {
			intent: 'resolved_findings',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.88,
		}
	}

	if (
		/liver history|show my liver|kidney history|heart history/i.test(normalized)
	) {
		return {
			intent: 'organ_status',
			categoryId: resolvedCategory ?? detectCategory(normalized),
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/what should i discuss with my doctor|discuss with my doctor|doctor visit/i.test(
			normalized,
		)
	) {
		return {
			intent: 'doctor_discussion',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (/abnormal|out of range|high|low|critical/i.test(normalized)) {
		return {
			intent: 'abnormal_reports',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.88,
		}
	}

	if (/improving|getting better|trending up/i.test(normalized)) {
		return {
			intent: 'improving_metrics',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.86,
		}
	}

	if (/declining|getting worse|worsening/i.test(normalized)) {
		return {
			intent: 'declining_metrics',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.86,
		}
	}

	if (/compare|what changed|difference between|versus|vs\b/i.test(normalized)) {
		return {
			intent: 'compare_reports',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/summarize|summary of|latest report|most recent report/i.test(normalized)
	) {
		return {
			intent: /latest|most recent/i.test(normalized)
				? 'latest_report'
				: 'summarize_report',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.88,
		}
	}

	if (
		/when was .* lowest|when was .* highest|lowest|highest/i.test(normalized)
	) {
		return {
			intent: 'metric_history',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.87,
		}
	}

	if (/trend|over time|changed over|history/i.test(normalized)) {
		return {
			intent: 'metric_trend',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.85,
		}
	}

	if (/how is my|how are my|status of my/i.test(normalized)) {
		return {
			intent: 'organ_status',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (resolvedMetric) {
		return {
			intent: 'metric_lookup',
			categoryId: resolvedCategory,
			metricName: resolvedMetric,
			timeRangeYears,
			confidence: 0.8,
		}
	}

	const documentCategory = resolveCategoryFromQuery(normalized)

	if (
		/when was my last health check|last health check|most recent health check/i.test(
			normalized,
		)
	) {
		return {
			intent: 'timeline_last_event',
			categoryId: resolvedCategory,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/show everything related to|everything related to|related to my/i.test(
			normalized,
		)
	) {
		return {
			intent: 'timeline_search',
			categoryId: documentCategory ?? resolvedCategory,
			timeRangeYears,
			confidence: 0.88,
		}
	}

	if (
		/what happened last year|what changed in|what happened in|timeline|life events|what happened this year/i.test(
			normalized,
		)
	) {
		return {
			intent: 'timeline_query',
			categoryId: documentCategory ?? resolvedCategory,
			timeRangeYears,
			confidence: 0.87,
		}
	}

	if (
		/when does .* expire|expir(e|ing|y)|expires this year|documents expiring/i.test(
			normalized,
		)
	) {
		return {
			intent: 'document_expiry',
			categoryId: documentCategory,
			timeRangeYears,
			confidence: 0.9,
		}
	}

	if (
		/passport|aadhaar|aadhar|pan card|driving licence|driving license|voter id|insurance policy|property papers|offer letter|bank statement|my passport|my pan/i.test(
			normalized,
		)
	) {
		return {
			intent: 'find_document',
			categoryId: documentCategory,
			timeRangeYears,
			confidence: 0.88,
		}
	}

	if (
		/show all documents|list documents|which documents|what documents|documents for/i.test(
			normalized,
		)
	) {
		return {
			intent: 'list_documents',
			categoryId: documentCategory,
			timeRangeYears,
			confidence: 0.86,
		}
	}

	if (/summarize (this )?document|document summary/i.test(normalized)) {
		return {
			intent: 'document_summary',
			categoryId: documentCategory,
			timeRangeYears,
			confidence: 0.84,
		}
	}

	if (
		documentCategory &&
		/insurance|property|identity|education|employment|financial|medical document/i.test(
			normalized,
		)
	) {
		return {
			intent: 'general_documents',
			categoryId: documentCategory,
			timeRangeYears,
			confidence: 0.82,
		}
	}

	return {
		intent: 'general_health',
		categoryId: resolvedCategory,
		metricName: resolvedMetric,
		timeRangeYears,
		confidence: 0.65,
	}
}

export function resolveQuestionWithContext(
	question: string,
	previousTopic?: {
		categoryId?: string
		metricName?: string
		reportId?: string
		timeRangeYears?: number
		intent?: string
		lastQuestion?: string
	},
): string {
	if (!previousTopic) {
		return question
	}

	const normalized = question.trim()

	const refersToPrevious =
		/^(how about|what about|and|last year|past year|that|those|it|them)\b/i.test(
			normalized,
		) ||
		/\b(how does that compare|compare with last year|was it improving|before that|compared to last year)\b/i.test(
			normalized,
		)

	if (!refersToPrevious) {
		return question
	}

	const subject = previousTopic.metricName
		? previousTopic.metricName
		: previousTopic.categoryId
			? `my ${previousTopic.categoryId}`
			: 'that topic'

	if (
		/how does that compare|compare with last year|compared to last year/i.test(
			normalized,
		)
	) {
		return `Compare ${subject} with last year`
	}

	if (/was it improving|before that/i.test(normalized)) {
		return `Show ${subject} trend history over time`
	}

	if (/last year|past year/i.test(normalized)) {
		return `Show ${subject} history over the past year`
	}

	return `Tell me more about ${subject}. ${question}`
}
