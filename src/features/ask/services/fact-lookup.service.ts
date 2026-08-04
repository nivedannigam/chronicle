import type { AskHealthContext } from '@/features/ask/context/ask-health-context.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { AskConversationTurn } from '@/features/ask/types'
import { generateFollowUpQuestions } from '@/features/intelligence/services/follow-up-generator.service'

function formatDisplayDate(iso: string): string {
	const parsed = Date.parse(iso)
	if (Number.isNaN(parsed)) {
		return iso
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function statusPhrase(status: string): string {
	switch (status) {
		case 'normal':
			return 'within normal range'
		case 'borderline':
			return 'borderline'
		case 'low':
			return 'below reference range'
		case 'high':
			return 'above reference range'
		case 'critical':
			return 'critically out of range'
		default:
			return 'recorded'
	}
}

function findTargetMetric(
	knowledge: RetrievedKnowledge,
	metricName?: string | null,
) {
	if (metricName) {
		const byName = knowledge.metrics.find(
			(metric) =>
				metric.displayName.toLowerCase() === metricName.toLowerCase() ||
				metric.canonicalId === metricName.toLowerCase().replace(/\s+/g, '-'),
		)

		if (byName) {
			return byName
		}
	}

	return knowledge.metrics[0] ?? null
}

/** Deterministic factual answer — not narrative synthesis. */
export function buildFactLookupTurn(input: {
	question: string
	knowledge: RetrievedKnowledge
	context: AskHealthContext
	memberId?: string | null
	memberName?: string | null
	domains: AskConversationTurn['domains']
	metricName?: string | null
}): AskConversationTurn | null {
	const metric = findTargetMetric(
		input.knowledge,
		input.metricName ?? input.context.rankedImportant[0]?.displayName,
	)

	if (!metric) {
		return null
	}

	const dateLabel = formatDisplayDate(metric.observedAt)
	const valueLabel = metric.unit
		? `${metric.latestValue} ${metric.unit}`.trim()
		: metric.latestValue

	const answer = `**${metric.displayName}:** ${valueLabel} (${dateLabel}) — ${statusPhrase(metric.status)}.`

	const timestamp = new Date().toISOString()

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer,
		cards: [],
		relatedReports: input.context.reportHistory.slice(0, 3).map((report) => ({
			id: report.id,
			title: report.title,
			date: report.date,
		})),
		relatedMetrics: [
			{
				name: metric.displayName,
				value: valueLabel,
				status: metric.status,
			},
		],
		citations: [],
		evidence: [],
		followUpQuestions: generateFollowUpQuestions({
			intent: input.knowledge.intent,
			knowledge: input.knowledge,
			memberName: input.memberName,
			question: input.question,
			domains: input.domains,
		}).slice(0, 4),
		memberId: input.memberId ?? null,
		memberName: input.memberName ?? null,
		domains: input.domains,
		dataAvailable: true,
		confidence: 0.92,
		confidenceLevel: 'high',
		timestamp,
		displayTimestamp: new Date(timestamp).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		}),
		platformResponse: {
			summary: answer.replace(/\*\*/g, ''),
			directAnswer: answer.replace(/\*\*/g, ''),
			overallStatus: metric.status === 'normal' ? 'stable' : 'needs_attention',
			keyFindings: [`${metric.displayName}: ${valueLabel}`],
			evidenceFromReports: [
				`${metric.displayName}: ${valueLabel} (${dateLabel})`,
			],
			whatChanged: [],
			whatItMayMean: [],
			doctorDiscussion: [],
			recommendations: [],
			followUpQuestions: [],
			confidence: 0.92,
			confidenceLevel: 'high',
			limitations: [],
			evidenceReferences: [],
			sourceReports: metric.reportId
				? [
						{
							id: metric.reportId,
							label: metric.reportTitle ?? 'Health report',
							sourceType: 'health_metric',
						},
					]
				: [],
		},
	}
}

export function buildNoRecordsTurn(input: {
	question: string
	memberId?: string | null
	memberName?: string | null
	domains: AskConversationTurn['domains']
}): AskConversationTurn {
	const timestamp = new Date().toISOString()
	const name = input.memberName ?? 'your records'

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer:
			"I don't have enough health records yet to answer that. Import a lab report to get started.",
		cards: [],
		relatedReports: [],
		relatedMetrics: [],
		citations: [],
		evidence: [],
		followUpQuestions: [
			'Explain my latest report.',
			'How am I doing?',
			'What should I discuss with my doctor?',
		],
		memberId: input.memberId ?? null,
		memberName: input.memberName ?? null,
		domains: input.domains,
		dataAvailable: false,
		confidence: 0,
		confidenceLevel: 'low',
		timestamp,
		displayTimestamp: new Date(timestamp).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		}),
		platformResponse: {
			summary: `I don't have enough health records for ${name} yet.`,
			directAnswer: `I don't have enough health records for ${name} yet. Import a lab report to get started.`,
			overallStatus: 'insufficient_data',
			keyFindings: [],
			evidenceFromReports: [],
			whatChanged: [],
			whatItMayMean: [],
			doctorDiscussion: [],
			recommendations: [],
			followUpQuestions: [],
			confidence: 0,
			confidenceLevel: 'low',
			limitations: [],
			evidenceReferences: [],
			sourceReports: [],
		},
	}
}
