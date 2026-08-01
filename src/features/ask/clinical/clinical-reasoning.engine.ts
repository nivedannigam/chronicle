import type { AskIntent } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type {
	ClinicalAnswer,
	ClinicalResponseInput,
	RankedEvidence,
	RankedMetric,
} from '@/features/ask/clinical/clinical-response.types'
import {
	rankEvidence,
	selectImportantMetrics,
} from '@/features/ask/clinical/evidence-ranking.engine'

const TREND_INTENTS = new Set<AskIntent>([
	'metric_trend',
	'metric_history',
	'compare_reports',
	'improving_metrics',
	'declining_metrics',
	'health_journey',
	'since_last_report',
])

const SUMMARY_INTENTS = new Set<AskIntent>([
	'general_health',
	'summarize_health',
	'summarize_report',
	'latest_report',
])

const MIN_CLASSIFIED_FOR_CONFIDENT_SUMMARY = 5

function memberPrefix(memberName?: string | null): string {
	return memberName ? `For ${memberName}, ` : ''
}

function formatReportDate(value: string): string {
	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function reportContext(
	input: ClinicalResponseInput,
	ranked: RankedEvidence,
): string {
	const coverage = input.coverage
	const latest = coverage?.latestUsableReport

	if (
		coverage?.corpusCompleteness === 'partial' &&
		latest &&
		coverage.discoveredCount > coverage.displayReadyCount
	) {
		const dateLabel = formatReportDate(latest.date)
		const labLabel = latest.lab || latest.title

		return `Based on your ${dateLabel} ${labLabel} report (${coverage.displayReadyCount} of ${coverage.discoveredCount} files in your folder imported successfully)`
	}

	if (ranked.singleReport && ranked.latestReportLabel) {
		return `Based on your latest available report (${ranked.latestReportLabel})`
	}

	if (ranked.reportCount > 1) {
		return `Based on ${ranked.reportCount} reports in your Chronicle records`
	}

	return 'Based on your Chronicle records'
}

function normalizeMetricValue(value: string): string {
	const parts = value
		.trim()
		.split(/\s+/)
		.filter(
			(part, index, array) =>
				index === 0 || part.toLowerCase() !== array[index - 1]?.toLowerCase(),
		)

	return parts.join(' ')
}

function formatMetricFinding(metric: RankedMetric): string {
	const statusLabel =
		metric.status === 'normal'
			? 'within normal range'
			: metric.status === 'borderline'
				? 'borderline'
				: metric.status
	const value = normalizeMetricValue(metric.latestValue)

	return `${metric.displayName}: ${value}${metric.unit ? ` ${metric.unit}` : ''} (${statusLabel})`
}

function buildAbnormalFindings(ranked: RankedEvidence): string[] {
	return ranked.metrics
		.filter(
			(metric) =>
				metric.status === 'low' ||
				metric.status === 'high' ||
				metric.status === 'critical' ||
				metric.status === 'borderline',
		)
		.slice(0, 5)
		.map(formatMetricFinding)
}

function buildExecutiveSummary(
	input: ClinicalResponseInput,
	ranked: RankedEvidence,
	important: RankedMetric[],
): string {
	const prefix = memberPrefix(input.memberName)
	const context = reportContext(input, ranked)
	const intent = input.knowledge.intent
	const classifiedCount = ranked.metrics.length

	if (!input.dataAvailable) {
		return prefix + "I don't have records in Chronicle that answer that yet."
	}

	if (intent === 'abnormal_reports' || intent === 'attention_summary') {
		if (ranked.abnormalCount === 0) {
			return `${prefix}${context}, no abnormal markers were identified in the retrieved results.`
		}

		return `${prefix}${context}, ${ranked.abnormalCount} marker${ranked.abnormalCount === 1 ? '' : 's'} need${ranked.abnormalCount === 1 ? 's' : ''} attention.`
	}

	if (intent === 'metric_lookup' && important[0]) {
		const metric = important[0]
		return `${prefix}${context}, ${metric.displayName} is ${normalizeMetricValue(metric.latestValue)}${metric.unit ? ` ${metric.unit}` : ''} (${metric.status === 'normal' ? 'within normal range' : metric.status}).`
	}

	if (intent === 'compare_reports') {
		if (ranked.singleReport) {
			const needed = Math.max(2 - ranked.reportCount, 1)
			return `${prefix}${context}. A comparison requires at least two reports — import ${needed} more report${needed === 1 ? '' : 's'} to compare.`
		}

		return `${prefix}${context}, here is how your key markers compare across reports.`
	}

	if (TREND_INTENTS.has(intent)) {
		if (ranked.singleReport || ranked.trends.length === 0) {
			return `${prefix}${context}. There isn't enough historical data yet to assess trends — import another report when available.`
		}

		const topTrend = ranked.trends[0]
		if (topTrend) {
			return `${prefix}${context}, ${topTrend.displayName} is ${topTrend.direction} (${topTrend.changePercent} change across ${topTrend.dataPointCount} readings).`
		}
	}

	if (SUMMARY_INTENTS.has(intent) || intent === 'organ_status') {
		if (
			classifiedCount < MIN_CLASSIFIED_FOR_CONFIDENT_SUMMARY ||
			input.coverage?.corpusCompleteness === 'partial'
		) {
			if (classifiedCount === 0) {
				return `${prefix}${context}, your imported results are available but no clinically prioritized markers were extracted yet.`
			}

			return `${prefix}${context}, partial extraction — reprocess recommended for a complete clinical summary.`
		}

		if (ranked.abnormalCount > 0) {
			return `${prefix}${context}, most markers look acceptable but ${ranked.abnormalCount} result${ranked.abnormalCount === 1 ? '' : 's'} need review.`
		}

		if (important.length === 0) {
			return `${prefix}${context}, your imported results are available but no clinically prioritized markers were extracted yet.`
		}

		if (ranked.singleReport) {
			return `${prefix}${context}, the reviewed markers are within expected ranges. Import a follow-up report to track changes over time.`
		}

		return `${prefix}${context}, tracked markers appear stable with no significant deterioration detected.`
	}

	if (intent === 'doctor_discussion') {
		return `${prefix}${context}, here are the findings worth discussing with your clinician.`
	}

	return `${prefix}${context}, here is what your records show for this question.`
}

function buildKeyFindings(
	intent: AskIntent,
	ranked: RankedEvidence,
	important: RankedMetric[],
): string[] {
	const findings: string[] = []

	if (intent === 'abnormal_reports' || intent === 'attention_summary') {
		findings.push(...buildAbnormalFindings(ranked))

		if (findings.length === 0) {
			findings.push('No abnormal markers identified in retrieved results.')
		}

		return findings.slice(0, 5)
	}

	if (intent === 'improving_metrics') {
		for (const trend of ranked.trends.filter(
			(item) => item.direction === 'improving',
		)) {
			findings.push(
				`${trend.displayName} is improving (${trend.changePercent} over ${trend.dataPointCount} readings).`,
			)
		}

		return findings.slice(0, 5)
	}

	if (intent === 'declining_metrics') {
		for (const trend of ranked.trends.filter(
			(item) =>
				item.direction === 'declining' || item.direction === 'rapid_change',
		)) {
			findings.push(
				`${trend.displayName} is declining (${trend.changePercent} over ${trend.dataPointCount} readings).`,
			)
		}

		return findings.slice(0, 5)
	}

	if (intent === 'metric_trend' || intent === 'metric_history') {
		for (const trend of ranked.trends.slice(0, 3)) {
			findings.push(
				`${trend.displayName}: ${trend.direction} (${trend.changePercent}, ${trend.dataPointCount} readings).`,
			)
		}

		if (findings.length === 0 && important[0]) {
			findings.push(formatMetricFinding(important[0]))
		}

		return findings
	}

	if (intent === 'compare_reports') {
		return ranked.insights.slice(0, 4)
	}

	for (const metric of important.slice(0, 4)) {
		findings.push(formatMetricFinding(metric))
	}

	if (
		ranked.abnormalCount > 0 &&
		!findings.some((line) => /need|borderline|high|low/i.test(line))
	) {
		const abnormal = buildAbnormalFindings(ranked).slice(0, 2)
		findings.unshift(...abnormal)
	}

	if (findings.length === 0 && ranked.alerts.length > 0) {
		findings.push(...ranked.alerts.slice(0, 3))
	}

	return [...new Set(findings)].slice(0, 5)
}

function buildRecommendations(
	intent: AskIntent,
	ranked: RankedEvidence,
): string[] {
	const recommendations: string[] = []

	if (ranked.abnormalCount > 0) {
		recommendations.push(
			'Review flagged markers with your clinician — Chronicle surfaces data, not diagnoses.',
		)
	}

	if (ranked.singleReport && TREND_INTENTS.has(intent)) {
		recommendations.push(
			'Import a prior or follow-up report to enable trend analysis.',
		)
	} else if (ranked.singleReport && !TREND_INTENTS.has(intent)) {
		// No trend recommendation for general summary with single report
	} else if (ranked.singleReport) {
		recommendations.push(
			'Import another report when available to track changes over time.',
		)
	}

	if (intent === 'doctor_discussion' && ranked.abnormalCount > 0) {
		recommendations.push(
			`Prepare to discuss ${ranked.abnormalCount} flagged marker${ranked.abnormalCount === 1 ? '' : 's'} and whether follow-up testing is needed.`,
		)
	}

	if (intent === 'compare_reports' && ranked.singleReport) {
		recommendations.push(
			'Upload a second report from a different date to enable comparison.',
		)
	}

	if (recommendations.length === 0 && ranked.reportCount === 0) {
		recommendations.push(
			'Import or upload health reports to build your clinical record.',
		)
	}

	return recommendations.slice(0, 3)
}

function buildLimitations(
	intent: AskIntent,
	ranked: RankedEvidence,
	coverage?: ClinicalResponseInput['coverage'],
): string[] {
	const limitations: string[] = []

	if (coverage?.limitations.length) {
		limitations.push(...coverage.limitations)
	}

	if (ranked.singleReport && TREND_INTENTS.has(intent)) {
		limitations.push(
			'Only one report is available — trend analysis requires at least two readings over time.',
		)
	}

	if (ranked.metrics.length === 0 && ranked.reports.length > 0) {
		limitations.push(
			'Structured metrics were not extracted from the retrieved reports.',
		)
	}

	if (
		ranked.metrics.length > 0 &&
		ranked.metrics.length < MIN_CLASSIFIED_FOR_CONFIDENT_SUMMARY &&
		SUMMARY_INTENTS.has(intent)
	) {
		limitations.push(
			'Only a small subset of markers was classified — reprocess the report for fuller coverage.',
		)
	}

	if (
		ranked.abnormalCount === 0 &&
		ranked.metrics.length >= MIN_CLASSIFIED_FOR_CONFIDENT_SUMMARY &&
		SUMMARY_INTENTS.has(intent) &&
		coverage?.corpusCompleteness !== 'partial'
	) {
		limitations.push(
			'This summary reflects extracted markers only — it is not a comprehensive medical evaluation.',
		)
	}

	return [...new Set(limitations)].slice(0, 4)
}

export function buildClinicalAnswer(
	input: ClinicalResponseInput,
): ClinicalAnswer {
	const ranked = rankEvidence(input.knowledge)
	const important = selectImportantMetrics(ranked, 4)
	const intent = input.knowledge.intent

	return {
		intent,
		executiveSummary: buildExecutiveSummary(input, ranked, important),
		keyFindings: buildKeyFindings(intent, ranked, important),
		recommendations: buildRecommendations(intent, ranked),
		limitations: buildLimitations(intent, ranked, input.coverage),
		rankedEvidence: ranked,
		importantMetricIds: important.map((metric) => metric.canonicalId),
		showTrendCards:
			!ranked.singleReport &&
			ranked.trends.length > 0 &&
			TREND_INTENTS.has(intent),
		showComparisonLanguage:
			!ranked.singleReport && intent === 'compare_reports',
	}
}

export function clinicalAnswerToProse(answer: ClinicalAnswer): string {
	const paragraphs = [answer.executiveSummary]

	if (answer.keyFindings.length > 0) {
		paragraphs.push(answer.keyFindings.join(' '))
	}

	paragraphs.push('This is informational and not medical advice.')

	return paragraphs.join('\n\n')
}
