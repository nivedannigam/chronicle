import { mapErrorToUserMessage } from '@/shared/ai/errors/ai-errors'
import type { AskConversationTurn } from '@/features/ask/types'
import type { BetaExperienceId } from '@/features/ask/beta/beta-experiences'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { StructuredAIResponse } from '@/shared/ai/types/structured-response.types'
import {
	parseConfidenceLevel,
	toConfidenceLevel,
} from '@/features/intelligence/types/confidence.types'
import { buildAskTurnShell } from '@/features/ask/services/grounded-response.builder'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'

function formatDisplayDate(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

/** Primary display text from Gemini structured response — no engineering headers. */
export function companionResponseToAnswer(
	response: StructuredAIResponse,
): string {
	return response.directAnswer ?? response.summary
}

export function platformResponseToAskTurn(input: {
	response: StructuredAIResponse
	healthKnowledge?: HealthKnowledge
	member: IntelligenceMemberContext
	domains: AskConversationTurn['domains']
	dataAvailable?: boolean
	question?: string
	betaExperienceId?: BetaExperienceId
}): AskConversationTurn {
	const { response, healthKnowledge } = input
	const latestReport = healthKnowledge?.latestReport
	const answer = companionResponseToAnswer(response)

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

	return {
		...buildAskTurnShell({
			question: input.question ?? 'Health question',
			knowledge: null,
			member: input.member,
			domains: input.domains,
			dataAvailable: input.dataAvailable ?? Boolean(latestReport),
			answer,
			platformResponse: response,
			confidence: response.confidence,
			cards: [],
		}),
		betaExperienceId: input.betaExperienceId,
		followUpQuestions: response.followUpQuestions.slice(0, 4),
		displayTimestamp: formatDisplayDate(new Date().toISOString()),
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
		citations,
		confidenceLevel,
	}
}

export function formatPlatformErrorForUser(error: unknown): string {
	return mapErrorToUserMessage(error)
}

export function buildNarrativeFailureTurn(input: {
	question: string
	member: IntelligenceMemberContext
	domains: AskConversationTurn['domains']
	error?: unknown
}): AskConversationTurn {
	const message =
		input.error != null
			? formatPlatformErrorForUser(input.error)
			: "I couldn't complete that request right now. Please try again in a moment."

	return buildAskTurnShell({
		question: input.question,
		knowledge: null,
		member: input.member,
		domains: input.domains,
		dataAvailable: false,
		answer: message,
		platformResponse: {
			summary: message,
			directAnswer: message,
			overallStatus: 'insufficient_data',
			keyFindings: [],
			evidenceFromReports: [],
			whatChanged: [],
			whatItMayMean: [],
			doctorDiscussion: [],
			recommendations: [],
			followUpQuestions: [],
			confidence: 0.2,
			confidenceLevel: 'low',
			limitations: [],
			evidenceReferences: [],
			sourceReports: [],
		},
	})
}
