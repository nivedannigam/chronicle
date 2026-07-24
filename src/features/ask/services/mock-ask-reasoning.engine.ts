import type { AskReasoningEngine } from '@/features/ask/services/knowledge-query.interface'
import { mockKnowledgeQueryService } from '@/features/ask/services/mock-knowledge-query.service'
import type {
	AnswerCardData,
	AskConversationTurn,
	AskQuestionResult,
	RelatedMetricRef,
	RelatedReportRef,
} from '@/features/ask/types'
import { getCategoryById } from '@/features/health/services/health.service'

function createTurnId(): string {
	return crypto.randomUUID()
}

const DEFAULT_TURN_FIELDS: Pick<
	AskConversationTurn,
	| 'citations'
	| 'evidence'
	| 'followUpQuestions'
	| 'memberId'
	| 'memberName'
	| 'domains'
	| 'dataAvailable'
> = {
	citations: [],
	evidence: [],
	followUpQuestions: [],
	memberId: null,
	memberName: null,
	domains: ['health'],
	dataAvailable: true,
}

function formatTimestamp(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

function toRelatedReports(
	reports: Array<{ id: string; title: string; displayDate: string }>,
): RelatedReportRef[] {
	return reports.map((report) => ({
		id: report.id,
		title: report.title,
		date: report.displayDate,
	}))
}

function toRelatedMetrics(
	metrics: Array<{ name: string; value: string; status: string }>,
): RelatedMetricRef[] {
	return metrics.map((metric) => ({
		name: metric.name,
		value: metric.value,
		status: metric.status,
	}))
}

type IntentTurn = Omit<
	AskConversationTurn,
	| 'id'
	| 'timestamp'
	| 'displayTimestamp'
	| 'citations'
	| 'evidence'
	| 'followUpQuestions'
	| 'memberId'
	| 'memberName'
	| 'domains'
	| 'dataAvailable'
> &
	Partial<
		Pick<
			AskConversationTurn,
			| 'citations'
			| 'evidence'
			| 'followUpQuestions'
			| 'memberId'
			| 'memberName'
			| 'domains'
			| 'dataAvailable'
		>
	>

type IntentHandler = (
	userId: string,
	question: string,
) => Omit<AskQuestionResult, 'turn'> & {
	turn: IntentTurn
}

const INTENT_HANDLERS: Array<{
	match: (question: string) => boolean
	intent: string
	handle: IntentHandler
}> = [
	{
		match: (q) => /how is my (liver|heart|kidney|thyroid|blood)/i.test(q),
		intent: 'organ_status',
		handle: (_userId, question) => {
			const category = mockKnowledgeQueryService.resolveCategory(question)!
			const categoryMeta = getCategoryById(category)
			const snapshot = mockKnowledgeQueryService
				.getSnapshots()
				.find(
					(item) =>
						item.id === category ||
						(category === 'blood-count' && item.id === 'blood') ||
						(category === 'vitamin' && item.id === 'vitamins') ||
						item.name.toLowerCase().includes(category.replace('-count', '')),
				)
			const reports = mockKnowledgeQueryService.findReports('', {
				category,
				limit: 3,
			})
			const latestReport = reports[0]
			const cards: AnswerCardData[] = []

			if (snapshot) {
				cards.push({
					type: 'summary',
					id: 'summary-organ',
					text: `${snapshot.name} status: ${snapshot.status}. Trend: ${snapshot.trend}. Latest result: ${snapshot.latestResultDate}.`,
				})
			}

			if (latestReport) {
				for (const metric of latestReport.metrics.slice(0, 4)) {
					cards.push({
						type: 'metric',
						id: `metric-${metric.name}`,
						name: metric.name,
						value: metric.value,
						reference: metric.reference,
						status: metric.status,
						reportTitle: latestReport.title,
						reportDate: latestReport.displayDate,
					})
				}

				cards.push({
					type: 'report',
					id: `report-${latestReport.id}`,
					reportId: latestReport.id,
					title: latestReport.title,
					date: latestReport.displayDate,
					lab: latestReport.lab,
					category: categoryMeta?.name ?? category,
					summary: latestReport.summary,
				})
			}

			const liverAction = mockKnowledgeQueryService
				.getUpcomingActions()
				.find((action) => action.title.toLowerCase().includes(category))

			if (liverAction) {
				cards.push({
					type: 'action',
					id: liverAction.id,
					title: liverAction.title,
					dueLabel: liverAction.dueLabel,
				})
			}

			return {
				intent: 'organ_status',
				implementation: 'mock-reasoning',
				turn: {
					question,
					answer: snapshot
						? `Your ${snapshot.name.toLowerCase()} markers are ${snapshot.status.toLowerCase()} based on your latest ${reports.length} report${reports.length === 1 ? '' : 's'}.`
						: `Found ${reports.length} related report${reports.length === 1 ? '' : 's'} in your health records.`,
					cards,
					relatedReports: toRelatedReports(reports),
					relatedMetrics: toRelatedMetrics(
						latestReport?.metrics.map((m) => ({
							name: m.name,
							value: m.value,
							status: m.status,
						})) ?? [],
					),
					confidence: 0.91,
				},
			}
		},
	},
	{
		match: (q) =>
			/vitamin d trend|show my vitamin d|vitamin d over time/i.test(q),
		intent: 'metric_trend',
		handle: (_userId, question) => buildTrendAnswer(question, 'vitamin d'),
	},
	{
		match: (q) =>
			/trend/i.test(q) &&
			/vitamin|b12|hba1c|cholesterol|weight|blood pressure/i.test(q),
		intent: 'metric_trend',
		handle: (_userId, question) => {
			const metricMatch = question.match(
				/vitamin d|b12|hba1c|cholesterol|weight|blood pressure/i,
			)
			return buildTrendAnswer(question, metricMatch?.[0] ?? 'vitamin d')
		},
	},
	{
		match: (q) =>
			/abnormal.*cholesterol|cholesterol.*abnormal|high cholesterol|high ldl/i.test(
				q,
			),
		intent: 'abnormal_reports',
		handle: (_userId, question) => {
			const reports = mockKnowledgeQueryService.findReports('', {
				metricName: 'cholesterol',
				abnormalOnly: true,
			})
			const metrics = mockKnowledgeQueryService.findMetrics('', 'LDL')

			const cards: AnswerCardData[] = [
				{
					type: 'summary',
					id: 'summary-abnormal',
					text:
						reports.length > 0
							? `${reports.length} report${reports.length === 1 ? '' : 's'} contain abnormal cholesterol markers.`
							: 'No reports with abnormal cholesterol markers were found.',
				},
			]

			for (const report of reports) {
				cards.push({
					type: 'report',
					id: `report-${report.id}`,
					reportId: report.id,
					title: report.title,
					date: report.displayDate,
					lab: report.lab,
					category: getCategoryById(report.category)?.name ?? report.category,
					summary: report.summary,
				})
			}

			for (const metric of metrics
				.filter((m) => m.status !== 'normal')
				.slice(0, 3)) {
				cards.push({
					type: 'metric',
					id: `metric-${metric.reportId}-${metric.metricName}`,
					name: metric.metricName,
					value: metric.value,
					reference: metric.reference,
					status: metric.status,
					reportTitle: metric.reportTitle,
					reportDate: metric.reportDate,
				})
			}

			return {
				intent: 'abnormal_reports',
				implementation: 'mock-reasoning',
				turn: {
					question,
					answer:
						reports.length > 0
							? `Found ${reports.length} report${reports.length === 1 ? '' : 's'} with abnormal cholesterol readings.`
							: 'No abnormal cholesterol results found in your records.',
					cards,
					relatedReports: toRelatedReports(reports),
					relatedMetrics: toRelatedMetrics(
						metrics.map((m) => ({
							name: m.metricName,
							value: m.value,
							status: m.status,
						})),
					),
					confidence: 0.88,
				},
			}
		},
	},
	{
		match: (q) =>
			/what changed|since my last checkup|since last checkup/i.test(q),
		intent: 'compare_checkup',
		handle: (_userId, question) => buildComparisonAnswer(question),
	},
	{
		match: (q) => /compare.*report|last two report/i.test(q),
		intent: 'compare_reports',
		handle: (_userId, question) => buildComparisonAnswer(question),
	},
	{
		match: (q) =>
			/summarize.*latest|latest report|summarize my report/i.test(q),
		intent: 'summarize_report',
		handle: (_userId, question) => buildSummaryAnswer(question),
	},
	{
		match: (q) => /show my latest health report|latest health report/i.test(q),
		intent: 'latest_report',
		handle: (_userId, question) => buildSummaryAnswer(question),
	},
	{
		match: (q) => /what should i monitor|what to monitor|monitor/i.test(q),
		intent: 'monitor',
		handle: (_userId, question) => {
			const snapshots = mockKnowledgeQueryService
				.getSnapshots()
				.filter(
					(item) =>
						item.trend === 'attention' ||
						item.trend === 'declining' ||
						item.status.toLowerCase().includes('low') ||
						item.status.toLowerCase().includes('borderline'),
				)
			const actions = mockKnowledgeQueryService.getUpcomingActions()

			const cards: AnswerCardData[] = [
				{
					type: 'summary',
					id: 'summary-monitor',
					text: `Based on your records, ${snapshots.length} area${snapshots.length === 1 ? '' : 's'} may need monitoring.`,
				},
				{
					type: 'timeline',
					id: 'timeline-monitor',
					items: snapshots.map((item) => ({
						title: `${item.emoji} ${item.name} — ${item.status}`,
						date: item.latestResultDate,
						status: item.trend,
					})),
				},
			]

			for (const action of actions) {
				cards.push({
					type: 'action',
					id: action.id,
					title: action.title,
					dueLabel: action.dueLabel,
				})
			}

			return {
				intent: 'monitor',
				implementation: 'mock-reasoning',
				turn: {
					question,
					answer:
						'These areas and scheduled follow-ups are flagged in your health records.',
					cards,
					relatedReports: [],
					relatedMetrics: snapshots.map((item) => ({
						name: item.name,
						value: item.status,
						status: item.trend,
					})),
					confidence: 0.86,
				},
			}
		},
	},
	{
		match: (q) => /vitamin d report|all vitamin d/i.test(q),
		intent: 'metric_reports',
		handle: (_userId, question) => {
			const reports = mockKnowledgeQueryService.findReports('', {
				metricName: 'Vitamin D',
			})
			const metrics = mockKnowledgeQueryService.findMetrics('', 'Vitamin D')
			const trend = mockKnowledgeQueryService.getTrendForMetric('Vitamin D')

			const cards: AnswerCardData[] = [
				{
					type: 'summary',
					id: 'summary-vitd-reports',
					text: `Found ${reports.length} report${reports.length === 1 ? '' : 's'} containing Vitamin D results.`,
				},
			]

			if (trend) {
				cards.push({
					type: 'trend',
					id: 'trend-vitamin-d',
					name: trend.name,
					unit: trend.unit,
					color: trend.color,
					values: trend.values,
					latestValue: `${trend.values[trend.values.length - 1]?.value ?? ''} ${trend.unit}`,
				})
			}

			for (const report of reports) {
				cards.push({
					type: 'report',
					id: `report-${report.id}`,
					reportId: report.id,
					title: report.title,
					date: report.displayDate,
					lab: report.lab,
					category: getCategoryById(report.category)?.name ?? report.category,
					summary: report.summary,
				})
			}

			return {
				intent: 'metric_reports',
				implementation: 'mock-reasoning',
				turn: {
					question,
					answer: `${reports.length} report${reports.length === 1 ? '' : 's'} include Vitamin D measurements in your Chronicle health records.`,
					cards,
					relatedReports: toRelatedReports(reports),
					relatedMetrics: toRelatedMetrics(
						metrics.map((m) => ({
							name: m.metricName,
							value: m.value,
							status: m.status,
						})),
					),
					confidence: 0.9,
				},
			}
		},
	},
]

function buildTrendAnswer(
	question: string,
	metricName: string,
): Omit<AskQuestionResult, 'turn'> & { turn: IntentTurn } {
	const trend = mockKnowledgeQueryService.getTrendForMetric(metricName)
	const metrics = mockKnowledgeQueryService.findMetrics('', metricName)

	const cards: AnswerCardData[] = []

	if (trend) {
		cards.push({
			type: 'trend',
			id: `trend-${trend.id}`,
			name: trend.name,
			unit: trend.unit,
			color: trend.color,
			values: trend.values,
			latestValue: `${trend.values[trend.values.length - 1]?.value ?? ''} ${trend.unit}`,
		})
	}

	cards.push({
		type: 'summary',
		id: 'summary-trend',
		text: trend
			? `${trend.name} readings from ${trend.values[0]?.label ?? ''} to ${trend.values[trend.values.length - 1]?.label ?? ''}.`
			: 'No trend data available for this metric.',
	})

	for (const metric of metrics.slice(0, 3)) {
		cards.push({
			type: 'metric',
			id: `metric-${metric.reportId}-${metric.metricName}`,
			name: metric.metricName,
			value: metric.value,
			reference: metric.reference,
			status: metric.status,
			reportTitle: metric.reportTitle,
			reportDate: metric.reportDate,
		})
	}

	return {
		intent: 'metric_trend',
		implementation: 'mock-reasoning',
		turn: {
			question,
			answer: trend
				? `Your ${trend.name} trend shows values from ${trend.values[0]?.value} to ${trend.values[trend.values.length - 1]?.value} ${trend.unit} across ${trend.values.length} readings.`
				: 'No trend data found for that metric.',
			cards,
			relatedReports: toRelatedReports(
				metrics.map((m) => ({
					id: m.reportId,
					title: m.reportTitle,
					displayDate: m.reportDate,
				})),
			),
			relatedMetrics: toRelatedMetrics(
				metrics.map((m) => ({
					name: m.metricName,
					value: m.value,
					status: m.status,
				})),
			),
			confidence: 0.89,
		},
	}
}

function buildComparisonAnswer(
	question: string,
): Omit<AskQuestionResult, 'turn'> & { turn: IntentTurn } {
	const comparison = mockKnowledgeQueryService.compareReports('')

	const cards: AnswerCardData[] = [
		{
			type: 'summary',
			id: 'summary-compare',
			text: comparison
				? `${comparison.label}: ${comparison.olderLabel} compared with ${comparison.newerLabel}.`
				: 'No comparison data available.',
		},
	]

	if (comparison) {
		for (const row of comparison.metrics) {
			cards.push({
				type: 'metric',
				id: `compare-${row.metric}`,
				name: row.metric,
				value: `${row.oldValue} → ${row.newValue} (${row.difference})`,
				reference: 'Change',
				status: row.status,
				reportTitle: comparison.label,
				reportDate: comparison.newerLabel,
			})
		}
	}

	return {
		intent: 'compare_reports',
		implementation: 'mock-reasoning',
		turn: {
			question,
			answer: comparison
				? `Comparing ${comparison.olderLabel} and ${comparison.newerLabel}: ${comparison.metrics.length} metrics changed.`
				: 'No report comparison available.',
			cards,
			relatedReports: [],
			relatedMetrics: toRelatedMetrics(
				comparison?.metrics.map((m) => ({
					name: m.metric,
					value: m.newValue,
					status: m.status,
				})) ?? [],
			),
			confidence: 0.87,
		},
	}
}

function buildSummaryAnswer(
	question: string,
): Omit<AskQuestionResult, 'turn'> & { turn: IntentTurn } {
	const summary = mockKnowledgeQueryService.summarizeReport('')

	if (!summary) {
		return {
			intent: 'summarize_report',
			implementation: 'mock-reasoning',
			turn: {
				question,
				answer: 'No health reports found in your records.',
				cards: [],
				relatedReports: [],
				relatedMetrics: [],
				confidence: 0.5,
			},
		}
	}

	const cards: AnswerCardData[] = [
		{
			type: 'summary',
			id: 'summary-report',
			text: summary.summary,
		},
		{
			type: 'report',
			id: `report-${summary.reportId}`,
			reportId: summary.reportId,
			title: summary.title,
			date: summary.date,
			lab: summary.lab,
			category: 'Health',
			summary: summary.summary,
		},
	]

	for (const metric of summary.metrics.slice(0, 5)) {
		cards.push({
			type: 'metric',
			id: `metric-${metric.name}`,
			name: metric.name,
			value: metric.value,
			reference: '',
			status: metric.status,
			reportTitle: summary.title,
			reportDate: summary.date,
		})
	}

	return {
		intent: 'summarize_report',
		implementation: 'mock-reasoning',
		turn: {
			question,
			answer: `${summary.title} (${summary.date}, ${summary.lab}): ${summary.summary}`,
			cards,
			relatedReports: [
				{ id: summary.reportId, title: summary.title, date: summary.date },
			],
			relatedMetrics: toRelatedMetrics(
				summary.metrics.map((m) => ({
					name: m.name,
					value: m.value,
					status: m.status,
				})),
			),
			confidence: 0.93,
		},
	}
}

function buildFallbackAnswer(
	userId: string,
	question: string,
): Omit<AskQuestionResult, 'turn'> & { turn: IntentTurn } {
	const searchResult = mockKnowledgeQueryService.searchKnowledge(
		userId,
		question,
	)
	const healthItems = searchResult.items.filter(
		(item) => item.source === 'health' || item.type === 'HealthReport',
	)

	const cards: AnswerCardData[] = [
		{
			type: 'summary',
			id: 'summary-fallback',
			text:
				healthItems.length > 0
					? `Found ${healthItems.length} related item${healthItems.length === 1 ? '' : 's'} in your Chronicle knowledge.`
					: 'No exact match found. Try a suggested question about your health records.',
		},
	]

	for (const item of healthItems.slice(0, 3)) {
		cards.push({
			type: 'report',
			id: `knowledge-${item.id}`,
			reportId: item.sourceId,
			title: item.title,
			date:
				typeof item.metadata.displayDate === 'string'
					? item.metadata.displayDate
					: item.createdAt.slice(0, 10),
			lab:
				typeof item.metadata.lab === 'string' ? item.metadata.lab : 'Chronicle',
			category: 'Health',
			summary: item.summary,
		})
	}

	return {
		intent: 'general_search',
		implementation: 'mock-reasoning',
		turn: {
			question,
			answer:
				healthItems.length > 0
					? `Here ${healthItems.length === 1 ? 'is' : 'are'} ${healthItems.length} related record${healthItems.length === 1 ? '' : 's'} from your knowledge.`
					: 'I could not find a specific match. Try asking about liver, Vitamin D, cholesterol, or your latest report.',
			cards,
			relatedReports: healthItems.map((item) => ({
				id: item.sourceId,
				title: item.title,
				date:
					typeof item.metadata.displayDate === 'string'
						? item.metadata.displayDate
						: item.createdAt.slice(0, 10),
			})),
			relatedMetrics: [],
			confidence: healthItems.length > 0 ? 0.72 : 0.45,
		},
	}
}

export class MockAskReasoningEngine implements AskReasoningEngine {
	async answerQuestion(input: {
		userId: string
		question: string
	}): Promise<AskQuestionResult> {
		const question = input.question.trim()

		if (!question) {
			throw new Error('Please enter a question.')
		}

		const handler = INTENT_HANDLERS.find((entry) => entry.match(question))
		const result = handler
			? handler.handle(input.userId, question)
			: buildFallbackAnswer(input.userId, question)

		const timestamp = new Date().toISOString()

		return {
			...result,
			turn: {
				...DEFAULT_TURN_FIELDS,
				...result.turn,
				id: createTurnId(),
				timestamp,
				displayTimestamp: formatTimestamp(timestamp),
			},
		}
	}
}

export const mockAskReasoningEngine = new MockAskReasoningEngine()
