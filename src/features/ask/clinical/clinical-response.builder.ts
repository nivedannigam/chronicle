import { C } from '@/constants/colors'
import type {
	AnswerCardData,
	AskMetricStatus,
} from '@/features/ask/types/ask.types'
import type { ClinicalAnswer } from '@/features/ask/clinical/clinical-response.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { RankedMetric } from '@/features/ask/clinical/clinical-response.types'

function dedupeRetrievedReports(
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

function metricToCard(metric: RankedMetric): AnswerCardData {
	return {
		type: 'metric',
		id: `metric-${metric.canonicalId}`,
		name: metric.displayName,
		value: metric.latestValue,
		reference: metric.referenceRange,
		status: metric.status as AskMetricStatus,
		reportTitle: metric.reportTitle,
		reportDate: metric.observedAt,
	}
}

export function buildClinicalCards(
	clinical: ClinicalAnswer,
	knowledge: RetrievedKnowledge,
): AnswerCardData[] {
	const cards: AnswerCardData[] = []
	const { rankedEvidence: ranked } = clinical

	const importantMetrics = ranked.metrics.filter((metric) =>
		clinical.importantMetricIds.includes(metric.canonicalId),
	)

	for (const metric of importantMetrics) {
		cards.push(metricToCard(metric))
	}

	if (clinical.showTrendCards) {
		for (const trend of ranked.trends.slice(0, 2)) {
			const history = knowledge.metricHistories?.find(
				(item) => item.canonicalId === trend.metricId,
			)

			if (!history || !trend.isActionable) {
				continue
			}

			cards.push({
				type: 'summary',
				id: `trend-summary-${trend.metricId}`,
				text: `${trend.displayName}: ${history.previousValue ?? '—'} → ${history.latestValue} (${trend.direction}, ${trend.changePercent}).`,
			})
		}
	}

	if (clinical.showTrendCards) {
		for (const timeline of knowledge.timelines.slice(0, 2)) {
			const numericObservations = timeline.observations.filter((item) =>
				/\d/.test(item.value),
			)

			if (numericObservations.length < 2) {
				continue
			}

			cards.push({
				type: 'trend',
				id: `trend-${timeline.metricId}`,
				name: timeline.displayName,
				unit: timeline.unit ?? '',
				color: C.accent,
				values: numericObservations.map((observation) => ({
					date: observation.observedAt,
					label: new Date(observation.observedAt).toLocaleDateString('en-US', {
						month: 'short',
					}),
					value: Number.parseFloat(
						observation.value.match(/-?\d+\.?\d*/)?.[0] ?? '0',
					),
					reportId: observation.reportId,
				})),
				latestValue: timeline.baseline.latest,
			})
		}
	}

	if (
		knowledge.intent === 'compare_reports' &&
		clinical.showComparisonLanguage
	) {
		for (const comparison of knowledge.comparisons.slice(0, 1)) {
			cards.push({
				type: 'comparison',
				id: comparison.id,
				label: comparison.label,
				olderLabel: comparison.olderLabel,
				newerLabel: comparison.newerLabel,
				metrics: comparison.metrics.map((metric) => ({
					...metric,
					status: metric.status as AskMetricStatus,
				})),
			})
		}
	}

	if (
		knowledge.intent === 'health_journey' &&
		knowledge.semanticTimeline &&
		knowledge.semanticTimeline.length > 0 &&
		!ranked.singleReport
	) {
		for (const group of knowledge.semanticTimeline.slice(-2)) {
			cards.push({
				type: 'timeline',
				id: `journey-${group.year}`,
				items: group.events.slice(0, 6).map((event) => ({
					title: event.label,
					date: event.date,
					status: event.kind,
					reportId: event.reportId,
				})),
			})
		}
	}

	for (const report of dedupeRetrievedReports(ranked.reports).slice(0, 1)) {
		cards.push({
			type: 'report',
			id: `report-${report.id}`,
			reportId: report.id,
			title: report.title,
			date: report.date,
			lab: report.lab,
			category: report.category,
			summary: report.summary,
		})
	}

	for (const alert of ranked.alerts.slice(0, 2)) {
		cards.push({
			type: 'alert',
			id: `alert-${alert.slice(0, 24)}`,
			message: alert,
			severity: 'attention',
		})
	}

	return cards
}

export function buildClinicalEvidenceLines(clinical: ClinicalAnswer): string[] {
	return clinical.rankedEvidence.metrics
		.filter((metric) =>
			clinical.importantMetricIds.includes(metric.canonicalId),
		)
		.slice(0, 4)
		.map((metric) => {
			const date = new Date(metric.observedAt).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})

			return `${metric.displayName}: ${metric.latestValue} (${metric.status}) — ${metric.reportTitle}, ${date}`
		})
}
