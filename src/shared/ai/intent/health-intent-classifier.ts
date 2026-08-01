import type {
	ChronicleIntent,
	ClassifiedIntent,
	IntentClassifier,
} from '@/shared/ai/intent/intent.types'

const METRIC_ALIASES: Array<{
	pattern: RegExp
	canonicalIds: string[]
	names: string[]
}> = [
	{
		pattern: /\b(hba1c|a1c|glycated hemoglobin)\b/i,
		canonicalIds: ['hba1c'],
		names: ['HbA1c'],
	},
	{
		pattern: /\b(ldl|bad cholesterol)\b/i,
		canonicalIds: ['ldl'],
		names: ['LDL Cholesterol', 'LDL'],
	},
	{
		pattern: /\b(hdl|good cholesterol)\b/i,
		canonicalIds: ['hdl'],
		names: ['HDL Cholesterol', 'HDL'],
	},
	{
		pattern: /\b(cholesterol|lipid|lipids)\b/i,
		canonicalIds: ['ldl', 'hdl', 'total-cholesterol', 'triglycerides'],
		names: [
			'LDL Cholesterol',
			'HDL Cholesterol',
			'Total Cholesterol',
			'Triglycerides',
		],
	},
	{
		pattern: /\b(triglyceride|triglycerides|tg)\b/i,
		canonicalIds: ['triglycerides'],
		names: ['Triglycerides'],
	},
	{
		pattern: /\b(vitamin d|25-oh|25 oh)\b/i,
		canonicalIds: ['vitamin-d'],
		names: ['Vitamin D'],
	},
	{
		pattern: /\b(vitamin b12|b12)\b/i,
		canonicalIds: ['vitamin-b12'],
		names: ['Vitamin B12'],
	},
	{
		pattern: /\b(creatinine)\b/i,
		canonicalIds: ['creatinine'],
		names: ['Creatinine'],
	},
	{
		pattern: /\b(egfr|gfr)\b/i,
		canonicalIds: ['egfr'],
		names: ['eGFR'],
	},
	{
		pattern: /\b(tsh|thyroid)\b/i,
		canonicalIds: ['tsh'],
		names: ['TSH'],
	},
	{
		pattern: /\b(hemoglobin|hb\b|haemoglobin)\b/i,
		canonicalIds: ['hemoglobin'],
		names: ['Hemoglobin'],
	},
	{
		pattern: /\b(alt|sgpt)\b/i,
		canonicalIds: ['alt'],
		names: ['ALT'],
	},
	{
		pattern: /\b(ast|sgot)\b/i,
		canonicalIds: ['ast'],
		names: ['AST'],
	},
	{
		pattern: /\b(fasting glucose|blood sugar|glucose)\b/i,
		canonicalIds: ['fasting-glucose', 'random-glucose'],
		names: ['Fasting Glucose', 'Glucose'],
	},
]

function detectMetrics(question: string): {
	metricIds: string[]
	metricNames: string[]
} {
	const metricIds = new Set<string>()
	const metricNames = new Set<string>()

	for (const alias of METRIC_ALIASES) {
		if (alias.pattern.test(question)) {
			for (const id of alias.canonicalIds) {
				metricIds.add(id)
			}

			for (const name of alias.names) {
				metricNames.add(name)
			}
		}
	}

	return {
		metricIds: [...metricIds],
		metricNames: [...metricNames],
	}
}

function detectTimeRange(question: string): number | undefined {
	if (/past three years|last three years|3 years/i.test(question)) {
		return 3
	}

	if (/past two years|last two years|2 years/i.test(question)) {
		return 2
	}

	if (/past year|last year|one year|1 year|since last year/i.test(question)) {
		return 1
	}

	return undefined
}

function baseResult(
	intent: ChronicleIntent,
	input: Partial<ClassifiedIntent> & { reasons: string[] },
): ClassifiedIntent {
	return {
		intent,
		domain: 'health',
		confidence: input.confidence ?? 0.8,
		metricIds: input.metricIds ?? [],
		metricNames: input.metricNames ?? [],
		categoryId: input.categoryId,
		timeRangeYears: input.timeRangeYears,
		reasons: input.reasons,
	}
}

export class HealthIntentClassifier implements IntentClassifier {
	readonly domain = 'health' as const

	classify(question: string): ClassifiedIntent {
		const normalized = question.trim()
		const metrics = detectMetrics(normalized)
		const timeRangeYears = detectTimeRange(normalized)

		if (
			/explain|what does|what is|what's|meaning of|tell me about/i.test(
				normalized,
			) &&
			metrics.metricIds.length > 0
		) {
			return baseResult('EXPLAIN_METRIC', {
				...metrics,
				confidence: 0.92,
				reasons: ['explain phrasing with metric reference'],
			})
		}

		if (
			/summarize my health|summary of my health|how is my health|health overall|overall health/i.test(
				normalized,
			)
		) {
			return baseResult('GENERAL_HEALTH_SUMMARY', {
				confidence: 0.9,
				reasons: ['general health summary phrasing'],
			})
		}

		if (
			/summarize.*report|summary of.*report|latest report|most recent report|recent report/i.test(
				normalized,
			)
		) {
			return baseResult('LATEST_REPORT', {
				confidence: 0.93,
				reasons: ['latest report phrasing'],
			})
		}

		if (
			/what changed|compare|comparison|difference between|since last|over time|vs last|versus last/i.test(
				normalized,
			)
		) {
			return baseResult('COMPARE_REPORTS', {
				...metrics,
				timeRangeYears,
				confidence: 0.9,
				reasons: ['comparison or change phrasing'],
			})
		}

		if (
			/trend|improving|declining|getting worse|getting better|over the years/i.test(
				normalized,
			)
		) {
			return baseResult('TREND_ANALYSIS', {
				...metrics,
				timeRangeYears,
				confidence: 0.88,
				reasons: ['trend phrasing'],
			})
		}

		if (
			/abnormal|out of range|high|low|concerning|attention|flagged|critical/i.test(
				normalized,
			)
		) {
			return baseResult('ABNORMAL_RESULTS', {
				...metrics,
				confidence: 0.87,
				reasons: ['abnormal results phrasing'],
			})
		}

		if (/normal|within range|look good|looking good/i.test(normalized)) {
			return baseResult('NORMAL_RESULTS', {
				...metrics,
				confidence: 0.85,
				reasons: ['normal results phrasing'],
			})
		}

		if (
			/recommend|next step|what should i do|follow up test|follow-up test|retest/i.test(
				normalized,
			)
		) {
			const intent = /follow.?up|retest|next test/i.test(normalized)
				? 'FOLLOW_UP_TESTS'
				: 'RECOMMENDATIONS'

			return baseResult(intent, {
				...metrics,
				confidence: 0.86,
				reasons: [`${intent.toLowerCase()} phrasing`],
			})
		}

		if (metrics.metricIds.length > 0) {
			return baseResult('SPECIFIC_METRIC', {
				...metrics,
				confidence: 0.84,
				reasons: ['metric-specific phrasing'],
			})
		}

		if (/how is my|what about my|show me my/i.test(normalized)) {
			return baseResult('GENERAL_HEALTH_SUMMARY', {
				confidence: 0.7,
				reasons: ['general health question fallback'],
			})
		}

		return baseResult('UNKNOWN', {
			confidence: 0.4,
			reasons: ['no matching intent rule'],
		})
	}
}

export const healthIntentClassifier = new HealthIntentClassifier()
