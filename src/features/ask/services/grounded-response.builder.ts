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
import {
	adaptAnswerForStyle,
	shouldIncludeAnswerCards,
} from '@/features/personalization/services/response-adapter.service'
import type { PersonalContext } from '@/features/personalization/types/personal-context.types'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import {
	buildClinicalAnswer,
	buildClinicalCards,
	buildClinicalEvidenceLines,
	clinicalAnswerToProse,
	rankEvidence,
	selectImportantMetrics,
} from '@/features/ask/clinical'

function formatTimestamp(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

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

function resolvedMetrics(knowledge: RetrievedKnowledge) {
	return knowledge.metrics.filter((metric) => metric.status !== 'unknown')
}

function toRelatedReports(knowledge: RetrievedKnowledge): RelatedReportRef[] {
	return dedupeRetrievedReports(knowledge.reports).map((report) => ({
		id: report.id,
		title: report.title,
		date: report.date,
	}))
}

function toRelatedMetrics(knowledge: RetrievedKnowledge): RelatedMetricRef[] {
	return resolvedMetrics(knowledge)
		.slice(0, 8)
		.map((metric) => ({
			name: metric.displayName,
			value: metric.latestValue,
			status: metric.status,
		}))
}

function buildEvidenceCitations(
	knowledge: RetrievedKnowledge,
): EvidenceCitation[] {
	const citations: EvidenceCitation[] = []
	const ranked = rankEvidence(knowledge)
	const important = selectImportantMetrics(ranked, 6)

	for (const metric of important) {
		const report = knowledge.reports.find((item) => item.id === metric.reportId)
		citations.push({
			reportId: metric.reportId,
			reportTitle: metric.reportTitle,
			hospital: report?.lab ?? '',
			date: metric.observedAt || report?.date || '',
			metricName: metric.displayName,
			metricId: metric.canonicalId,
			source: knowledge.domain,
		})
	}

	for (const report of dedupeRetrievedReports(knowledge.reports).slice(0, 4)) {
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

	return citations.slice(0, 8)
}

function buildEvidenceLines(knowledge: RetrievedKnowledge): string[] {
	const clinical = buildClinicalAnswer({
		knowledge,
		question: '',
		dataAvailable: true,
	})

	return buildClinicalEvidenceLines(clinical)
}

function buildCards(
	knowledge: RetrievedKnowledge,
	clinical: ReturnType<typeof buildClinicalAnswer>,
): AnswerCardData[] {
	return buildClinicalCards(clinical, knowledge)
}

function buildGroundedAnswer(input: {
	knowledge: RetrievedKnowledge | null
	question: string
	memberName?: string | null
	dataAvailable: boolean
	coverage?: HealthCoverageSnapshot | null
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

	const clinical = buildClinicalAnswer({
		knowledge: input.knowledge,
		question: input.question,
		memberName: input.memberName,
		dataAvailable: input.dataAvailable,
		coverage: input.coverage,
	})

	return clinicalAnswerToProse(clinical)
}

export function buildGroundedTurn(input: {
	question: string
	knowledge: RetrievedKnowledge | null
	member: IntelligenceMemberContext
	domains: KnowledgeDomain[]
	dataAvailable: boolean
	confidence?: number
	uploadedReports?: unknown[]
	personalContext?: PersonalContext
	coverage?: HealthCoverageSnapshot | null
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

	const clinicalAnswer = input.dataAvailable
		? buildClinicalAnswer({
				knowledge,
				question: input.question,
				memberName: input.member.memberName,
				dataAvailable: input.dataAvailable,
				coverage: input.coverage,
			})
		: undefined

	const rawAnswer = buildGroundedAnswer({
		knowledge: input.knowledge,
		question: input.question,
		memberName: input.member.memberName,
		dataAvailable: input.dataAvailable,
		coverage: input.coverage,
	})

	const adaptedAnswer = input.personalContext
		? adaptAnswerForStyle({
				answer: rawAnswer,
				style: input.personalContext.preferences.communicationStyle,
				knowledge: input.knowledge,
				memberName: input.member.memberName,
			})
		: rawAnswer

	const trust = buildTrustResponse({
		answer: adaptedAnswer,
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
		clinicalAnswer,
	})

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer: trust.directAnswer,
		clinicalAnswer,
		cards:
			input.dataAvailable &&
			clinicalAnswer &&
			(!input.personalContext ||
				shouldIncludeAnswerCards(
					input.personalContext.preferences.communicationStyle,
					input.personalContext.preferences.displayFormat,
				))
				? buildCards(knowledge, clinicalAnswer)
				: [],
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
		uploadedReports?: unknown[]
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
		clinicalAnswer: turn.clinicalAnswer,
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
