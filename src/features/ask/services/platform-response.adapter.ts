import { mapErrorToUserMessage } from '@/shared/ai/errors/ai-errors'
import type { AskConversationTurn } from '@/features/ask/types'
import type { BetaExperienceId } from '@/features/ask/beta/beta-experiences'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { StructuredAIResponse } from '@/shared/ai/types/structured-response.types'
import {
	parseConfidenceLevel,
	toConfidenceLevel,
} from '@/features/intelligence/types/confidence.types'

function formatDisplayDate(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

export function platformResponseToAskTurn(input: {
	response: StructuredAIResponse
	healthKnowledge?: HealthKnowledge
	memberId?: string | null
	memberName?: string | null
	dataAvailable?: boolean
	question?: string
	betaExperienceId?: BetaExperienceId
}): AskConversationTurn {
	const { response, healthKnowledge } = input
	const latestReport = healthKnowledge?.latestReport
	const displayTimestamp = formatDisplayDate(new Date().toISOString())

	const answerParts = [response.summary]

	if (response.keyFindings.length > 0) {
		answerParts.push(
			'',
			'Key findings:',
			...response.keyFindings.map((f) => `• ${f}`),
		)
	}

	if (response.recommendations.length > 0) {
		answerParts.push(
			'',
			'Recommendations:',
			...response.recommendations.map((r) => `• ${r}`),
		)
	}

	if (response.limitations.length > 0) {
		answerParts.push(
			'',
			'Limitations:',
			...response.limitations.map((l) => `• ${l}`),
		)
	}

	const citations = response.evidenceReferences
		.filter(
			(ref) =>
				ref.sourceType.includes('metric') || ref.sourceType.includes('report'),
		)
		.map((ref) => {
			const metric = healthKnowledge?.metrics.find((item) => item.id === ref.id)
			const report =
				healthKnowledge?.latestReport?.id === ref.id
					? healthKnowledge.latestReport
					: healthKnowledge?.previousReports.find((item) => item.id === ref.id)

			return {
				reportId: metric?.reportId ?? report?.id ?? ref.id,
				reportTitle: metric?.reportTitle ?? report?.title ?? ref.label,
				hospital: report?.lab ?? '',
				date: metric?.observedAt ?? report?.date ?? '',
				metricName: metric?.displayName,
				metricId: metric?.canonicalId,
				source: 'health' as const,
			}
		})

	const confidenceLevel =
		parseConfidenceLevel(response.confidence) ??
		toConfidenceLevel(response.confidence)

	const reportCount =
		(healthKnowledge?.previousReports.length ?? 0) +
		(healthKnowledge?.latestReport ? 1 : 0)

	const clinicalAnswer = {
		intent: 'summarize_report' as const,
		executiveSummary: response.summary,
		keyFindings: response.keyFindings,
		recommendations: response.recommendations,
		limitations: response.limitations,
		rankedEvidence: {
			metrics: [],
			trends: [],
			insights: response.keyFindings,
			alerts: [],
			reports: latestReport
				? [
						{
							id: latestReport.id,
							title: latestReport.title,
							date: latestReport.date,
							lab: latestReport.lab ?? '',
							category: latestReport.reportType ?? 'Health',
							summary: `${latestReport.metricCount} metrics · ${latestReport.lab}`,
						},
					]
				: [],
			reportCount,
			singleReport: reportCount <= 1,
			latestReportLabel: latestReport?.title ?? null,
			abnormalCount: healthKnowledge?.abnormalMetrics.length ?? 0,
			normalCount: healthKnowledge?.normalMetrics.length ?? 0,
		},
		importantMetricIds: (healthKnowledge?.abnormalMetrics ?? [])
			.slice(0, 6)
			.map((metric) => metric.canonicalId),
		showTrendCards: false,
		showComparisonLanguage: false,
	}

	return {
		id: crypto.randomUUID(),
		question: input.question ?? 'Health question',
		answer: answerParts.join('\n'),
		clinicalAnswer,
		timestamp: new Date().toISOString(),
		displayTimestamp,
		confidence: response.confidence,
		confidenceLevel,
		cards: [],
		evidence: response.keyFindings,
		citations,
		relatedReports: latestReport
			? [
					{
						id: latestReport.id,
						title: latestReport.title,
						date: latestReport.date,
					},
				]
			: [],
		relatedMetrics: (healthKnowledge?.abnormalMetrics ?? [])
			.slice(0, 6)
			.map((metric) => ({
				name: metric.displayName,
				value: metric.unit ? `${metric.value} ${metric.unit}` : metric.value,
				status: metric.status,
			})),
		followUpQuestions: response.followUpQuestions,
		memberId: input.memberId ?? null,
		memberName: input.memberName ?? null,
		domains: ['health'],
		dataAvailable: input.dataAvailable ?? Boolean(latestReport),
		betaExperienceId: input.betaExperienceId,
	}
}

export function formatPlatformErrorForUser(error: unknown): string {
	return mapErrorToUserMessage(error)
}
