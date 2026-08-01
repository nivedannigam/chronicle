import type {
	RetrievedKnowledge,
	RetrievedMetric,
	RetrievedTrend,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type {
	RankedEvidence,
	RankedMetric,
	RankedTrend,
} from '@/features/ask/clinical/clinical-response.types'

const ABNORMAL_STATUSES = new Set(['low', 'high', 'critical', 'borderline'])

const KEY_PANEL_CATEGORIES = new Set([
	'heart',
	'diabetes',
	'liver',
	'kidney',
	'thyroid',
	'blood',
	'blood-count',
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

function dedupeReports(
	reports: RetrievedKnowledge['reports'],
): RetrievedKnowledge['reports'] {
	const result: RetrievedKnowledge['reports'] = []
	const seenKeys = new Set<string>()

	for (const report of reports) {
		if (report.title.endsWith('.pdf')) {
			const hasParsedSibling = reports.some(
				(item) =>
					item.id !== report.id &&
					!item.title.endsWith('.pdf') &&
					(item.date === report.date || item.lab === report.lab),
			)

			if (hasParsedSibling) {
				continue
			}
		}

		const key = `${report.title.toLowerCase()}::${report.date}`

		if (seenKeys.has(key)) {
			continue
		}

		seenKeys.add(key)
		result.push(report)
	}

	return result
}

function isUrineMicroscopy(metric: RetrievedMetric): boolean {
	if (URINE_MICROSCOPY_PATTERN.test(metric.displayName)) {
		return true
	}

	if (
		QUALITATIVE_NORMAL_VALUES.test(metric.latestValue.trim()) &&
		metric.status === 'normal' &&
		!/\d/.test(metric.latestValue)
	) {
		return URINE_MICROSCOPY_PATTERN.test(metric.displayName)
	}

	return false
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

function rankMetric(metric: RetrievedMetric): RankedMetric {
	let score = statusScore(metric.status)
	const reasons: string[] = []

	if (ABNORMAL_STATUSES.has(metric.status)) {
		reasons.push('abnormal result')
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

	if (metric.status === 'unknown') {
		score -= 40
	}

	const priority: RankedMetric['priority'] =
		score >= 90
			? 'critical'
			: score >= 60
				? 'high'
				: score >= 30
					? 'medium'
					: 'low'

	return {
		...metric,
		clinicalScore: Math.max(0, score),
		priority,
		rankingReason: reasons.join(', ') || 'routine marker',
	}
}

function isActionableTrend(trend: RetrievedTrend): boolean {
	return (
		trend.direction !== 'unknown' &&
		trend.dataPointCount >= 2 &&
		trend.changePercent !== '—' &&
		trend.changePercent !== 'null'
	)
}

function rankTrend(trend: RetrievedTrend): RankedTrend {
	let score = 0

	if (isActionableTrend(trend)) {
		score += 50

		if (trend.direction === 'declining' || trend.direction === 'rapid_change') {
			score += 40
		} else if (trend.direction === 'improving') {
			score += 25
		}
	}

	if (HIGH_RISK_METRIC_IDS.has(trend.metricId)) {
		score += 20
	}

	return {
		...trend,
		clinicalScore: score,
		isActionable: isActionableTrend(trend),
	}
}

function formatReportLabel(report: RetrievedKnowledge['reports'][0]): string {
	const date = report.date
		? new Date(report.date).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		: ''

	const parts = [date, report.lab || report.title].filter(Boolean)
	return parts.join(' — ')
}

export function rankEvidence(knowledge: RetrievedKnowledge): RankedEvidence {
	const reports = dedupeReports(knowledge.reports)
	const reportCount = reports.length
	const singleReport = reportCount === 1

	const metrics = knowledge.metrics
		.filter((metric) => metric.status !== 'unknown')
		.map(rankMetric)
		.sort((a, b) => b.clinicalScore - a.clinicalScore)

	const trends = knowledge.trends
		.map(rankTrend)
		.filter((trend) => trend.isActionable)
		.sort((a, b) => b.clinicalScore - a.clinicalScore)

	const abnormalCount = metrics.filter((metric) =>
		ABNORMAL_STATUSES.has(metric.status),
	).length
	const normalCount = metrics.length - abnormalCount

	const latestReport = reports[0]

	return {
		metrics,
		trends,
		insights: knowledge.insights,
		alerts: knowledge.alerts,
		reports,
		reportCount,
		singleReport,
		latestReportLabel: latestReport ? formatReportLabel(latestReport) : null,
		abnormalCount,
		normalCount,
	}
}

export function selectImportantMetrics(
	ranked: RankedEvidence,
	limit = 4,
): RankedMetric[] {
	const selected: RankedMetric[] = []
	const seen = new Set<string>()

	for (const metric of ranked.metrics) {
		if (metric.priority === 'low' && selected.length >= 2) {
			continue
		}

		if (seen.has(metric.canonicalId)) {
			continue
		}

		seen.add(metric.canonicalId)
		selected.push(metric)

		if (selected.length >= limit) {
			break
		}
	}

	return selected
}
