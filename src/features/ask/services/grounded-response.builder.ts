import { getReportComparisons } from '@/features/health/services/health.service'
import { C } from '@/constants/colors'
import type {
	AnswerCardData,
	AskConversationTurn,
	RelatedMetricRef,
	RelatedReportRef,
} from '@/features/ask/types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

function formatTimestamp(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

function toRelatedReports(knowledge: RetrievedKnowledge): RelatedReportRef[] {
	return knowledge.reports.map((report) => ({
		id: report.id,
		title: report.title,
		date: report.date,
	}))
}

function toRelatedMetrics(knowledge: RetrievedKnowledge): RelatedMetricRef[] {
	return knowledge.metrics.slice(0, 8).map((metric) => ({
		name: metric.displayName,
		value: metric.latestValue,
		status: metric.status,
	}))
}

function buildCards(knowledge: RetrievedKnowledge): AnswerCardData[] {
	const cards: AnswerCardData[] = []

	if (knowledge.summaryLines.length > 0) {
		cards.push({
			type: 'summary',
			id: 'summary-grounded',
			text: knowledge.summaryLines.slice(0, 3).join(' '),
		})
	}

	for (const metric of knowledge.metrics.slice(0, 4)) {
		cards.push({
			type: 'metric',
			id: `metric-${metric.canonicalId}`,
			name: metric.displayName,
			value: metric.latestValue,
			reference: metric.referenceRange,
			status: metric.status as import('@/features/health/types').MetricStatus,
			reportTitle: metric.reportTitle,
			reportDate: metric.observedAt,
		})
	}

	for (const timeline of knowledge.timelines.slice(0, 2)) {
		cards.push({
			type: 'timeline',
			id: `timeline-${timeline.metricId}`,
			items: timeline.observations.map((observation) => ({
				title: `${observation.displayName}: ${observation.value}`,
				date: observation.observedAt,
				status: observation.status,
				reportId: observation.reportId,
			})),
		})

		if (
			timeline.observations.filter((item) => item.value.match(/\d/)).length >= 2
		) {
			cards.push({
				type: 'trend',
				id: `trend-${timeline.metricId}`,
				name: timeline.displayName,
				unit: timeline.unit ?? '',
				color: C.accent,
				values: timeline.observations
					.filter((observation) => /\d/.test(observation.value))
					.map((observation) => ({
						date: observation.observedAt,
						label: new Date(observation.observedAt).toLocaleDateString(
							'en-US',
							{
								month: 'short',
							},
						),
						value: Number.parseFloat(
							observation.value.match(/-?\d+\.?\d*/)?.[0] ?? '0',
						),
						reportId: observation.reportId,
					})),
				latestValue: timeline.baseline.latest,
			})
		}
	}

	for (const report of knowledge.reports.slice(0, 2)) {
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

	if (knowledge.intent === 'compare_reports') {
		const comparison = getReportComparisons()[0]

		if (comparison) {
			cards.push({
				type: 'comparison',
				id: comparison.id,
				label: comparison.label,
				olderLabel: comparison.olderLabel,
				newerLabel: comparison.newerLabel,
				metrics: comparison.metrics,
			})
		}
	}

	for (const alert of knowledge.alerts.slice(0, 2)) {
		cards.push({
			type: 'alert',
			id: `alert-${alert.slice(0, 24)}`,
			message: alert,
			severity: 'attention',
		})
	}

	return cards
}

function buildGroundedAnswer(
	knowledge: RetrievedKnowledge,
	question: string,
): string {
	const lines: string[] = []

	if (knowledge.summaryLines.length > 0) {
		lines.push(
			`Based on your reports, ${knowledge.summaryLines[0].toLowerCase()}`,
		)
	} else if (knowledge.metrics.length > 0) {
		const metric = knowledge.metrics[0]
		lines.push(
			`Based on your reports, your latest ${metric.displayName} is ${metric.latestValue} (${metric.status}) from ${metric.reportTitle}.`,
		)
	} else if (knowledge.reports.length > 0) {
		lines.push(
			`Based on your reports, I found ${knowledge.reports.length} related report${knowledge.reports.length === 1 ? '' : 's'} in your health knowledge graph.`,
		)
	} else {
		lines.push(
			'I do not have enough structured health data in your knowledge graph to answer that question.',
		)
	}

	if (
		knowledge.timelines.length > 0 &&
		/trend|change|over|history|lowest|highest/i.test(question)
	) {
		const timeline = knowledge.timelines[0]
		const first = timeline.observations[0]
		const last = timeline.observations[timeline.observations.length - 1]

		if (first && last && first.id !== last.id) {
			lines.push(
				`${timeline.displayName} changed from ${first.value} (${first.reportTitle}) to ${last.value} (${last.reportTitle}). Trend: ${timeline.trend}.`,
			)
		}
	}

	if (knowledge.intent === 'doctor_discussion') {
		const discussionPoints = [
			...knowledge.alerts.slice(0, 2),
			...knowledge.insights
				.filter((insight) =>
					/attention|declining|abnormal|low|high/i.test(insight),
				)
				.slice(0, 2),
		]

		if (discussionPoints.length > 0) {
			lines.push(
				`You may want to discuss these findings with your healthcare professional: ${discussionPoints.join('; ')}.`,
			)
		}
	}

	lines.push('This is informational and not medical advice.')

	return lines.join(' ')
}

export function buildGroundedTurn(input: {
	question: string
	knowledge: RetrievedKnowledge
	confidence?: number
}): AskConversationTurn {
	const timestamp = new Date().toISOString()

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer: buildGroundedAnswer(input.knowledge, input.question),
		cards: buildCards(input.knowledge),
		relatedReports: toRelatedReports(input.knowledge),
		relatedMetrics: toRelatedMetrics(input.knowledge),
		confidence:
			input.confidence ??
			Math.min(0.95, 0.55 + input.knowledge.metrics.length * 0.05),
		timestamp,
		displayTimestamp: formatTimestamp(timestamp),
	}
}

export interface ParsedAiResponse {
	answer: string
	confidence: number
	citations: Array<{
		reportId: string
		reportTitle: string
		metricName?: string
	}>
}

export function parseAiJsonResponse(content: string): ParsedAiResponse | null {
	try {
		const parsed = JSON.parse(content) as ParsedAiResponse

		if (!parsed.answer) {
			return null
		}

		return parsed
	} catch {
		return null
	}
}

export function verifyCitations(
	response: ParsedAiResponse,
	knowledge: RetrievedKnowledge,
): ParsedAiResponse {
	const allowedReportIds = new Set(knowledge.reports.map((report) => report.id))
	const allowedMetrics = new Set(
		knowledge.metrics.map((metric) => metric.displayName.toLowerCase()),
	)

	return {
		...response,
		citations: (response.citations ?? []).filter((citation) => {
			if (!allowedReportIds.has(citation.reportId)) {
				return false
			}

			if (
				citation.metricName &&
				!allowedMetrics.has(citation.metricName.toLowerCase())
			) {
				return false
			}

			return true
		}),
	}
}
