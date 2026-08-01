import type {
	HealthKnowledgeMetric,
	KnowledgeMetricPriority,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { MetricCategoryId } from '@/features/health-knowledge/types/health-knowledge.types'

const ABNORMAL_STATUSES = new Set(['low', 'high', 'critical', 'borderline'])

const KEY_PANEL_CATEGORIES = new Set<MetricCategoryId>([
	'heart',
	'diabetes',
	'liver',
	'kidney',
	'thyroid',
	'blood',
])

const HIGH_RISK_METRIC_IDS = new Set([
	'hba1c',
	'fasting-glucose',
	'random-glucose',
	'ldl',
	'hdl',
	'total-cholesterol',
	'triglycerides',
	'creatinine',
	'egfr',
	'urea',
	'alt',
	'ast',
	'ggt',
	'alp',
	'tsh',
	't3',
	't4',
	'hemoglobin',
	'wbc',
	'platelet-count',
	'vitamin-d',
	'vitamin-b12',
])

const URINE_MICROSCOPY_PATTERN =
	/\b(bacteria|casts|crystals|pus|epithelial|bile|yeast|mucus|amorphous|nitrite|leucocyte|leukocyte|parasite|urobilinogen|protein|glucose|ketone|ph|specific gravity|colour|color)\b/i

const QUALITATIVE_NORMAL_VALUES =
	/^(absent|negative|nil|not detected|none|normal)$/i

export interface RankableMetricInput {
	id: string
	canonicalId: string
	displayName: string
	value: string
	unit: string | null
	status: string
	categoryId: MetricCategoryId
	observedAt: string
	reportId: string
	reportTitle: string
	referenceRange: string
	source: HealthKnowledgeMetric['source']
	confidence: number
	validationStatus: HealthKnowledgeMetric['validationStatus']
}

function isUrineMicroscopy(metric: RankableMetricInput): boolean {
	if (metric.categoryId === 'urine') {
		return true
	}

	if (URINE_MICROSCOPY_PATTERN.test(metric.displayName)) {
		return true
	}

	if (
		QUALITATIVE_NORMAL_VALUES.test(metric.value.trim()) &&
		metric.status === 'normal' &&
		!/\d/.test(metric.value)
	) {
		return URINE_MICROSCOPY_PATTERN.test(metric.displayName)
	}

	return false
}

function isQualitativeMetric(metric: RankableMetricInput): boolean {
	return (
		!/\d/.test(metric.value) ||
		QUALITATIVE_NORMAL_VALUES.test(metric.value.trim())
	)
}

function statusScore(status: string): number {
	switch (status) {
		case 'critical':
			return 100
		case 'high':
		case 'low':
			return 85
		case 'borderline':
			return 70
		case 'unknown':
			return 10
		default:
			return 20
	}
}

function derivePriority(score: number): KnowledgeMetricPriority {
	if (score >= 90) {
		return 'critical'
	}

	if (score >= 60) {
		return 'high'
	}

	if (score >= 30) {
		return 'medium'
	}

	return 'low'
}

export function rankHealthMetric(
	metric: RankableMetricInput,
): HealthKnowledgeMetric {
	let score = statusScore(metric.status)
	const reasons: string[] = []

	if (ABNORMAL_STATUSES.has(metric.status)) {
		reasons.push('abnormal result')
	}

	if (metric.status === 'critical') {
		reasons.push('critical marker')
	}

	if (HIGH_RISK_METRIC_IDS.has(metric.canonicalId)) {
		score += 35
		reasons.push('key biomarker')
	}

	if (KEY_PANEL_CATEGORIES.has(metric.categoryId)) {
		score += 20
		reasons.push('core health panel')
	}

	if (isUrineMicroscopy(metric) && metric.status === 'normal') {
		score -= 60
		reasons.push('routine qualitative finding')
	}

	if (isQualitativeMetric(metric) && metric.status === 'normal') {
		score -= 25
		reasons.push('qualitative result')
	}

	if (metric.status === 'unknown') {
		score -= 40
	}

	const clinicalScore = Math.max(0, score)

	return {
		...metric,
		isQualitative: isQualitativeMetric(metric),
		clinicalScore,
		priority: derivePriority(clinicalScore),
		rankingReason: reasons.join(', ') || 'routine marker',
	}
}

export function rankHealthMetrics(
	metrics: RankableMetricInput[],
): HealthKnowledgeMetric[] {
	return metrics
		.filter((metric) => metric.status !== 'unknown')
		.map(rankHealthMetric)
		.sort((a, b) => b.clinicalScore - a.clinicalScore)
}

export function partitionRankedMetrics(metrics: HealthKnowledgeMetric[]): {
	abnormal: HealthKnowledgeMetric[]
	normal: HealthKnowledgeMetric[]
	critical: HealthKnowledgeMetric[]
	borderline: HealthKnowledgeMetric[]
} {
	const abnormal: HealthKnowledgeMetric[] = []
	const normal: HealthKnowledgeMetric[] = []
	const critical: HealthKnowledgeMetric[] = []
	const borderline: HealthKnowledgeMetric[] = []

	for (const metric of metrics) {
		if (metric.status === 'critical') {
			critical.push(metric)
		}

		if (metric.status === 'borderline') {
			borderline.push(metric)
		}

		if (ABNORMAL_STATUSES.has(metric.status)) {
			abnormal.push(metric)
		} else if (metric.status === 'normal') {
			normal.push(metric)
		}
	}

	return { abnormal, normal, critical, borderline }
}

export { ABNORMAL_STATUSES, HIGH_RISK_METRIC_IDS }
