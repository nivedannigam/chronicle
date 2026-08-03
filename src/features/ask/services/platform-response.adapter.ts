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

function buildCompanionAnswer(response: StructuredAIResponse): string {
	const sections: string[] = [response.directAnswer ?? response.summary]

	if (response.evidenceFromReports?.length) {
		sections.push(
			'',
			'Evidence from your reports:',
			...response.evidenceFromReports.map((item) => `• ${item}`),
		)
	}

	if (response.whatChanged?.length) {
		sections.push(
			'',
			'What changed:',
			...response.whatChanged.map((item) => `• ${item}`),
		)
	}

	if (response.whatItMayMean?.length) {
		sections.push(
			'',
			'What it may mean:',
			...response.whatItMayMean.map((item) => `• ${item}`),
		)
	}

	if (response.doctorDiscussion?.length) {
		sections.push(
			'',
			'Worth discussing with your doctor:',
			...response.doctorDiscussion.map((item) => `• ${item}`),
		)
	}

	if (response.limitations.length > 0) {
		sections.push(
			'',
			'Limitations:',
			...response.limitations.map((item) => `• ${item}`),
		)
	}

	return sections.join('\n')
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
	const sourceRefs = response.sourceReports ?? response.evidenceReferences

	const citations = sourceRefs
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
		response.confidenceLevel ??
		parseConfidenceLevel(response.confidence) ??
		toConfidenceLevel(response.confidence)

	const reportCount =
		(healthKnowledge?.previousReports.length ?? 0) +
		(healthKnowledge?.latestReport ? 1 : 0)

	const evidenceFromReports =
		response.evidenceFromReports ?? response.keyFindings

	const clinicalAnswer = {
		intent: 'summarize_report' as const,
		executiveSummary: response.directAnswer ?? response.summary,
		keyFindings: evidenceFromReports,
		recommendations: response.doctorDiscussion ?? response.recommendations,
		limitations: response.limitations,
		rankedEvidence: {
			metrics: [],
			trends: [],
			insights: evidenceFromReports,
			alerts: response.whatChanged ?? [],
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
		showComparisonLanguage: (response.whatChanged?.length ?? 0) > 0,
	}

	return {
		id: crypto.randomUUID(),
		question: input.question ?? 'Health question',
		answer: buildCompanionAnswer(response),
		clinicalAnswer,
		timestamp: new Date().toISOString(),
		displayTimestamp,
		confidence: response.confidence,
		confidenceLevel,
		cards: [],
		evidence: evidenceFromReports,
		citations,
		relatedReports: sourceRefs
			.filter((ref) => ref.sourceType.includes('report'))
			.map((ref) => {
				const report =
					healthKnowledge?.latestReport?.id === ref.id
						? healthKnowledge.latestReport
						: healthKnowledge?.previousReports.find(
								(item) => item.id === ref.id,
							)

				return {
					id: ref.id,
					title: report?.title ?? ref.label,
					date: report?.date ?? '',
				}
			}),
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
		platformResponse: response,
	}
}

export function formatPlatformErrorForUser(error: unknown): string {
	return mapErrorToUserMessage(error)
}
