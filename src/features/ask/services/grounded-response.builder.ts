import { C } from '@/constants/colors'
import type {
	AnswerCardData,
	AskConversationTurn,
	EvidenceCitation,
	RelatedMetricRef,
	RelatedReportRef,
} from '@/features/ask/types'
import type { ConfidenceLevel } from '@/features/intelligence/types/confidence.types'
import { parseConfidenceLevel } from '@/features/intelligence/types/confidence.types'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'
import { generateFollowUpQuestions } from '@/features/intelligence/services/follow-up-generator.service'
import { buildTrustResponse } from '@/features/ask/trust/trust-response.builder'
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

	if (knowledge.semanticTimeline && knowledge.semanticTimeline.length > 0) {
		for (const group of knowledge.semanticTimeline.slice(-3)) {
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

	for (const trend of knowledge.trends.slice(0, 2)) {
		const history = knowledge.metricHistories?.find(
			(item) => item.canonicalId === trend.metricId,
		)

		if (!history) {
			continue
		}

		cards.push({
			type: 'summary',
			id: `trend-summary-${trend.metricId}`,
			text: `${trend.displayName}: ${history.previousValue ?? '—'} → ${history.latestValue} (${trend.direction}, ${trend.changePercent}). Range ${history.lowest ?? '—'}–${history.highest ?? '—'}.`,
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
		for (const comparison of knowledge.comparisons.slice(0, 1)) {
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
		/trend|change|over|history|lowest|highest|journey|since last year/i.test(
			input.question,
		)
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

	if (knowledge.semanticTimeline && knowledge.semanticTimeline.length > 0) {
		const recent = knowledge.semanticTimeline.slice(-2)

		for (const group of recent) {
			if (group.events.length > 0) {
				lines.push(
					`In ${group.year}: ${group.events.map((event) => event.label).join('; ')}.`,
				)
			}
		}
	}

	if (knowledge.metricHistories && knowledge.metricHistories.length > 0) {
		const history = knowledge.metricHistories[0]!

		if (/how has|changed over|since last year/i.test(input.question)) {
			lines.push(
				`${history.displayName} changed from ${history.previousValue ?? '—'} to ${history.latestValue} (${history.trendDirection}, ${history.changePercent ?? '—'}).`,
			)
		}
	}

	if (
		knowledge.intent === 'doctor_discussion' ||
		knowledge.intent === 'attention_summary'
	) {
		const discussionPoints = [
			...knowledge.alerts.slice(0, 2),
			...knowledge.insights.slice(0, 3),
		]

		if (discussionPoints.length > 0) {
			lines.push(
				`Based on your Chronicle records, you may want to review: ${discussionPoints.join('; ')}.`,
			)
		}
	}

	if (
		knowledge.intent === 'summarize_health' ||
		knowledge.intent === 'health_journey'
	) {
		if (knowledge.insights.length > 0) {
			lines.push(knowledge.insights.slice(0, 3).join(' '))
		}
	}

	if (
		knowledge.intent === 'since_last_report' &&
		knowledge.summaryLines.length > 0
	) {
		lines.push(knowledge.summaryLines[0]!)
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
	uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
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
			comparisons: [],
		} satisfies RetrievedKnowledge)

	const citations = input.dataAvailable ? buildEvidenceCitations(knowledge) : []
	const evidence = input.dataAvailable ? buildEvidenceLines(knowledge) : []
	const relatedReports = input.dataAvailable ? toRelatedReports(knowledge) : []
	const relatedMetrics = input.dataAvailable ? toRelatedMetrics(knowledge) : []
	const followUpQuestions = generateFollowUpQuestions({
		intent: knowledge.intent,
		knowledge,
		memberName: input.member.memberName,
		question: input.question,
		domains: input.domains,
	})

	const rawAnswer = buildGroundedAnswer({
		knowledge: input.knowledge,
		question: input.question,
		memberName: input.member.memberName,
		dataAvailable: input.dataAvailable,
	})

	const trust = buildTrustResponse({
		answer: rawAnswer,
		question: input.question,
		knowledge,
		dataAvailable: input.dataAvailable,
		evidence,
		citations,
		relatedReports,
		relatedMetrics,
		followUpQuestions,
		intentConfidence: input.confidence,
		uploadedReports: input.uploadedReports,
	})

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer: trust.directAnswer,
		cards: input.dataAvailable ? buildCards(knowledge) : [],
		relatedReports: trust.supportingReports,
		relatedMetrics,
		citations: trust.evidenceItems.length
			? trust.evidenceItems.map((item) => ({
					reportId: item.reportId,
					reportTitle: item.reportTitle,
					hospital: item.hospital ?? '',
					date: item.reportDate,
					metricName: item.metricName,
					metricId: item.metricId,
					ocrExcerpt: item.ocrExcerpt,
					claimKind: item.claimKind,
					source: item.source,
				}))
			: citations,
		evidence: trust.evidence,
		followUpQuestions: trust.followUpQuestions,
		memberId: input.member.memberId,
		memberName: input.member.memberName,
		domains: input.domains,
		dataAvailable: input.dataAvailable,
		confidence: trust.confidence.score,
		confidenceLevel: trust.confidence.level,
		trust,
		timestamp,
		displayTimestamp: formatTimestamp(timestamp),
	}
}

export function attachTrustToTurn(
	turn: AskConversationTurn,
	input: {
		knowledge: RetrievedKnowledge | null
		question: string
		dataAvailable: boolean
		uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
		confidence?: number
	},
): AskConversationTurn {
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
			comparisons: [],
		} satisfies RetrievedKnowledge)

	const trust = buildTrustResponse({
		answer: turn.answer,
		question: input.question,
		knowledge,
		dataAvailable: input.dataAvailable,
		evidence: turn.evidence,
		citations: turn.citations,
		relatedReports: turn.relatedReports,
		relatedMetrics: turn.relatedMetrics,
		followUpQuestions: turn.followUpQuestions,
		intentConfidence: input.confidence,
		uploadedReports: input.uploadedReports,
	})

	return {
		...turn,
		answer: trust.directAnswer,
		relatedReports: trust.supportingReports,
		confidence: trust.confidence.score,
		confidenceLevel: trust.confidence.level,
		trust,
		citations: trust.evidenceItems.length
			? trust.evidenceItems.map((item) => ({
					reportId: item.reportId,
					reportTitle: item.reportTitle,
					hospital: item.hospital ?? '',
					date: item.reportDate,
					metricName: item.metricName,
					metricId: item.metricId,
					ocrExcerpt: item.ocrExcerpt,
					claimKind: item.claimKind,
					source: item.source,
				}))
			: turn.citations,
	}
}

export interface ParsedAiResponse {
	answer: string
	confidence: number | ConfidenceLevel
	confidenceLevel?: ConfidenceLevel
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

		const level =
			parseConfidenceLevel(parsed.confidenceLevel) ??
			parseConfidenceLevel(parsed.confidence)

		return {
			...parsed,
			confidenceLevel: level ?? 'medium',
			confidence:
				typeof parsed.confidence === 'number'
					? parsed.confidence
					: level
						? level === 'high'
							? 0.9
							: level === 'medium'
								? 0.75
								: 0.55
						: 0.7,
		}
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
