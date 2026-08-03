import type { CompanionConfidenceLevel } from '@/shared/ai/types/companion-response.types'
import type { StructuredAIResponse } from '@/shared/ai/types/structured-response.types'

export function confidenceNumberToLevel(
	value: number,
): CompanionConfidenceLevel {
	if (value >= 0.75) {
		return 'high'
	}

	if (value >= 0.5) {
		return 'medium'
	}

	return 'low'
}

/**
 * Normalizes legacy and companion-shaped LLM output into one canonical response.
 * Legacy fields remain populated for backward compatibility.
 */
export function normalizeCompanionResponse(
	raw: StructuredAIResponse,
): StructuredAIResponse {
	const directAnswer = raw.directAnswer?.trim() || raw.summary
	const evidenceFromReports =
		(raw.evidenceFromReports?.length ?? 0) > 0
			? (raw.evidenceFromReports ?? [])
			: raw.keyFindings
	const whatChanged = raw.whatChanged ?? []
	const whatItMayMean =
		(raw.whatItMayMean?.length ?? 0) > 0 ? (raw.whatItMayMean ?? []) : []
	const doctorDiscussionFromRecommendations = raw.recommendations.filter(
		(item) =>
			/doctor|clinician|physician|discuss|follow-up|follow up/i.test(item),
	)
	const doctorDiscussion =
		(raw.doctorDiscussion?.length ?? 0) > 0
			? (raw.doctorDiscussion ?? [])
			: doctorDiscussionFromRecommendations
	const confidenceLevel =
		raw.confidenceLevel ?? confidenceNumberToLevel(raw.confidence)
	const reportSources = raw.evidenceReferences.filter((ref) =>
		ref.sourceType.includes('report'),
	)
	const sourceReports =
		(raw.sourceReports?.length ?? 0) > 0
			? (raw.sourceReports ?? [])
			: reportSources

	const resolvedWhatItMayMean =
		whatItMayMean.length > 0
			? whatItMayMean
			: raw.overallStatus === 'needs_attention'
				? ['Some markers may benefit from follow-up based on your reports.']
				: []

	const resolvedDoctorDiscussion =
		doctorDiscussion.length > 0
			? doctorDiscussion
			: raw.recommendations.slice(0, 3)

	const resolvedSourceReports =
		sourceReports.length > 0 ? sourceReports : raw.evidenceReferences

	return {
		...raw,
		summary: directAnswer,
		directAnswer,
		keyFindings: evidenceFromReports,
		evidenceFromReports,
		whatChanged,
		whatItMayMean: resolvedWhatItMayMean,
		doctorDiscussion: resolvedDoctorDiscussion,
		confidenceLevel,
		sourceReports: resolvedSourceReports,
		recommendations: raw.recommendations,
	}
}
