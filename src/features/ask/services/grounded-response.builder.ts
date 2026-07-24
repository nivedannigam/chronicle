import { getReportComparisons } from '@/features/health/services/health.service'
import { C } from '@/constants/colors'
import type {
	AnswerCardData,
	AskConversationTurn,
	EvidenceCitation,
	RelatedMetricRef,
	RelatedReportRef,
} from '@/features/ask/types'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'
import { generateFollowUpQuestions } from '@/features/intelligence/services/follow-up-generator.service'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'

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

function buildEvidenceCitations(
	knowledge: RetrievedKnowledge,
): EvidenceCitation[] {
	const citations: EvidenceCitation[] = []

	for (const metric of knowledge.metrics.slice(0, 6)) {
		const report = knowledge.reports.find((item) => item.id === metric.reportId)
		citations.push({
			reportId: metric.reportId,
			reportTitle: metric.reportTitle,
			hospital: report?.lab ?? '',
			date: metric.observedAt || report?.date || '',
			metricName: metric.displayName,
			source: knowledge.domain,
		})
	}

	for (const report of knowledge.reports.slice(0, 4)) {
		if (citations.some((citation) => citation.reportId === report.id)) {
			continue
		}

		citations.push({
			reportId: report.id,
			reportTitle: report.title,
			hospital: report.lab,
			date: report.date,
			source: knowledge.domain,
		})
	}

	for (const timeline of knowledge.timelines.slice(0, 2)) {
		const latest = timeline.observations[timeline.observations.length - 1]

		if (!latest) {
			continue
		}

		citations.push({
			reportId: latest.reportId,
			reportTitle: latest.reportTitle,
			hospital: '',
			date: latest.observedAt,
			metricName: timeline.displayName,
			timelineRef: `${timeline.displayName} timeline`,
			source: knowledge.domain,
		})
	}

	return citations.slice(0, 8)
}

function buildEvidenceLines(knowledge: RetrievedKnowledge): string[] {
	const lines: string[] = []

	for (const metric of knowledge.metrics.slice(0, 4)) {
		lines.push(
			`${metric.displayName}: ${metric.latestValue} (${metric.status}) — ${metric.reportTitle}, ${metric.observedAt}`,
		)
	}

	for (const report of knowledge.reports.slice(0, 2)) {
		lines.push(`${report.title} · ${report.lab} · ${report.date}`)
	}

	return lines
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
							{ month: 'short' },
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

function buildGroundedAnswer(input: {
	knowledge: RetrievedKnowledge | null
	question: string
	memberName?: string | null
	dataAvailable: boolean
}): string {
	if (!input.dataAvailable || !input.knowledge) {
		return [
			input.memberName
				? `I don't have records for ${input.memberName} that answer that yet.`
				: "I don't have records in Chronicle that answer that yet.",
			'Today I can search Health reports, metrics, and timelines. As you enable more Chronicle capabilities, I will understand those too.',
			'This is informational and not medical advice.',
		].join(' ')
	}

	const knowledge = input.knowledge
	const lines: string[] = []
	const memberPrefix = input.memberName ? `For ${input.memberName}, ` : ''

	if (knowledge.summaryLines.length > 0) {
		lines.push(
			`${memberPrefix}based on your Chronicle records, ${knowledge.summaryLines[0]!.toLowerCase()}`,
		)
	} else if (knowledge.metrics.length > 0) {
		const metric = knowledge.metrics[0]!
		lines.push(
			`${memberPrefix}in your records, the latest ${metric.displayName} is ${metric.latestValue} (${metric.status}) from ${metric.reportTitle} on ${metric.observedAt}.`,
		)
	} else if (knowledge.reports.length > 0) {
		lines.push(
			`${memberPrefix}I found ${knowledge.reports.length} related report${knowledge.reports.length === 1 ? '' : 's'} in your Chronicle knowledge graph.`,
		)
	}

	if (
		knowledge.timelines.length > 0 &&
		/trend|change|over|history|lowest|highest/i.test(input.question)
	) {
		const timeline = knowledge.timelines[0]!
		const first = timeline.observations[0]
		const last = timeline.observations[timeline.observations.length - 1]

		if (first && last && first.id !== last.id) {
			lines.push(
				`${timeline.displayName} moved from ${first.value} (${first.reportTitle}) to ${last.value} (${last.reportTitle}). Trend: ${timeline.trend}.`,
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
				`You may want to discuss with your healthcare professional: ${discussionPoints.join('; ')}.`,
			)
		}
	}

	lines.push('This is informational and not medical advice.')

	return lines.join(' ')
}

export function buildGroundedTurn(input: {
	question: string
	knowledge: RetrievedKnowledge | null
	member: IntelligenceMemberContext
	domains: KnowledgeDomain[]
	dataAvailable: boolean
	confidence?: number
}): AskConversationTurn {
	const timestamp = new Date().toISOString()
	const knowledge =
		input.knowledge ??
		({
			domain: 'health',
			intent: 'general_health',
			reports: [],
			metrics: [],
			timelines: [],
			trends: [],
			observations: [],
			relationships: [],
			insights: [],
			alerts: [],
			summaryLines: [],
		} satisfies RetrievedKnowledge)

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer: buildGroundedAnswer({
			knowledge: input.knowledge,
			question: input.question,
			memberName: input.member.memberName,
			dataAvailable: input.dataAvailable,
		}),
		cards: input.dataAvailable ? buildCards(knowledge) : [],
		relatedReports: input.dataAvailable ? toRelatedReports(knowledge) : [],
		relatedMetrics: input.dataAvailable ? toRelatedMetrics(knowledge) : [],
		citations: input.dataAvailable ? buildEvidenceCitations(knowledge) : [],
		evidence: input.dataAvailable ? buildEvidenceLines(knowledge) : [],
		followUpQuestions: generateFollowUpQuestions({
			intent: knowledge.intent,
			knowledge,
			memberName: input.member.memberName,
			question: input.question,
			domains: input.domains,
		}),
		memberId: input.member.memberId,
		memberName: input.member.memberName,
		domains: input.domains,
		dataAvailable: input.dataAvailable,
		confidence:
			input.confidence ??
			(input.dataAvailable
				? Math.min(0.95, 0.55 + knowledge.metrics.length * 0.05)
				: 0.35),
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
		hospital?: string
		date?: string
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

export function extractPartialAnswerFromJsonStream(
	content: string,
): string | null {
	const completeMatch = content.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)"/)

	if (completeMatch?.[1] != null) {
		try {
			return JSON.parse(`"${completeMatch[1]}"`) as string
		} catch {
			return completeMatch[1]
				.replace(/\\n/g, '\n')
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, '\\')
		}
	}

	const partialMatch = content.match(/"answer"\s*:\s*"([^"]*)$/)

	if (partialMatch?.[1] != null) {
		return partialMatch[1]
			.replace(/\\n/g, '\n')
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, '\\')
	}

	return null
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

export function citationsFromAiResponse(
	response: ParsedAiResponse,
	knowledge: RetrievedKnowledge,
): EvidenceCitation[] {
	return response.citations.map((citation) => {
		const report = knowledge.reports.find(
			(item) => item.id === citation.reportId,
		)

		return {
			reportId: citation.reportId,
			reportTitle: citation.reportTitle || report?.title || 'Report',
			hospital: citation.hospital || report?.lab || '',
			date: citation.date || report?.date || '',
			metricName: citation.metricName,
			source: knowledge.domain,
		}
	})
}
