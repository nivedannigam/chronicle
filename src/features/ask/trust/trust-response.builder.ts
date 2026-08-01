import type {
	EvidenceCitation,
	RelatedMetricRef,
	RelatedReportRef,
} from '@/features/ask/types'
import {
	computeTrustConfidence,
	detectReportDisagreements,
} from '@/features/ask/trust/disagreement-detector'
import type {
	TrustEvidenceItem,
	TrustResponse,
} from '@/features/ask/trust/trust.types'
import {
	EXPLAINABILITY_PROMPTS,
	TRUST_SAFETY_FOOTER,
} from '@/features/ask/trust/trust.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

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

function truncateExcerpt(text: string, maxLength = 160): string {
	const cleaned = text.replace(/\s+/g, ' ').trim()

	if (cleaned.length <= maxLength) {
		return cleaned
	}

	return `${cleaned.slice(0, maxLength)}…`
}

function isReportWithOcr(
	item: unknown,
): item is { id: string; extracted_text?: string | null } {
	return (
		typeof item === 'object' &&
		item != null &&
		'id' in item &&
		typeof (item as { id: unknown }).id === 'string'
	)
}

function findOcrExcerpt(input: {
	reportId: string
	metricName?: string
	uploadedReports?: unknown[]
}): string | undefined {
	if (!input.uploadedReports?.length) {
		return undefined
	}

	const report = input.uploadedReports.find(
		(item) => isReportWithOcr(item) && item.id === input.reportId,
	)

	if (!isReportWithOcr(report) || !report.extracted_text) {
		return undefined
	}

	if (input.metricName) {
		const index = report.extracted_text
			.toLowerCase()
			.indexOf(input.metricName.toLowerCase())

		if (index >= 0) {
			return truncateExcerpt(
				report.extracted_text.slice(Math.max(0, index - 40), index + 120),
			)
		}
	}

	return truncateExcerpt(report.extracted_text.slice(0, 200))
}

export function buildTrustEvidenceItems(input: {
	knowledge: RetrievedKnowledge
	uploadedReports?: unknown[]
}): TrustEvidenceItem[] {
	const items: TrustEvidenceItem[] = []
	const { knowledge } = input

	for (const metric of knowledge.metrics.slice(0, 8)) {
		const ocrExcerpt = findOcrExcerpt({
			reportId: metric.reportId,
			metricName: metric.displayName,
			uploadedReports: input.uploadedReports,
		})

		items.push({
			id: `ev-metric-${metric.reportId}-${metric.canonicalId}`,
			reportId: metric.reportId,
			reportTitle: metric.reportTitle,
			reportDate: metric.observedAt,
			hospital: knowledge.reports.find(
				(report) => report.id === metric.reportId,
			)?.lab,
			metricName: metric.displayName,
			metricId: metric.canonicalId,
			metricValue: metric.latestValue,
			ocrExcerpt,
			section: 'Structured metrics',
			claimKind: 'known_fact',
			source: knowledge.domain,
		})
	}

	for (const report of dedupeRetrievedReports(knowledge.reports).slice(0, 6)) {
		if (items.some((item) => item.reportId === report.id && !item.metricName)) {
			continue
		}

		const ocrExcerpt = findOcrExcerpt({
			reportId: report.id,
			uploadedReports: input.uploadedReports,
		})

		items.push({
			id: `ev-report-${report.id}`,
			reportId: report.id,
			reportTitle: report.title,
			reportDate: report.date,
			hospital: report.lab,
			ocrExcerpt,
			section: ocrExcerpt ? 'OCR text' : 'Report metadata',
			claimKind: ocrExcerpt ? 'inference' : 'known_fact',
			source: knowledge.domain,
		})
	}

	return items.slice(0, 10)
}

function buildMissingInformation(input: {
	knowledge: RetrievedKnowledge
	dataAvailable: boolean
	question: string
}): string[] {
	const missing: string[] = []

	if (!input.dataAvailable) {
		missing.push('No matching health records were found for this question.')
		missing.push(
			'Chronicle cannot answer from data it does not have — upload or import relevant reports to improve coverage.',
		)

		return missing
	}

	if (input.knowledge.reports.length === 0) {
		missing.push('No report documents were retrieved for this question.')
	}

	if (
		input.knowledge.metrics.length === 0 &&
		/metric|value|result/i.test(input.question)
	) {
		missing.push('No structured metrics matched this question.')
	}

	if (
		input.knowledge.timelines.length === 0 &&
		/trend|history|over time|journey/i.test(input.question)
	) {
		missing.push(
			'Insufficient historical readings to build a timeline for this topic.',
		)
	}

	if (missing.length === 0 && input.knowledge.reports.length === 1) {
		missing.push(
			'Only one report is available — trends and comparisons may be limited.',
		)
	}

	return missing.slice(0, 4)
}

function buildTimelineSummary(knowledge: RetrievedKnowledge): string[] {
	const lines: string[] = []

	if (knowledge.semanticTimeline?.length) {
		for (const group of knowledge.semanticTimeline.slice(-3)) {
			if (group.events.length > 0) {
				lines.push(
					`${group.year}: ${group.events
						.slice(0, 4)
						.map((event) => event.label)
						.join('; ')}`,
				)
			}
		}
	}

	for (const timeline of knowledge.timelines.slice(0, 2)) {
		const first = timeline.observations[0]
		const last = timeline.observations[timeline.observations.length - 1]

		if (first && last && first.id !== last.id) {
			lines.push(
				`${timeline.displayName}: ${first.value} (${first.observedAt.slice(0, 10)}) → ${last.value} (${last.observedAt.slice(0, 10)})`,
			)
		}
	}

	return lines.slice(0, 5)
}

export function buildTrustResponse(input: {
	answer: string
	question: string
	knowledge: RetrievedKnowledge
	dataAvailable: boolean
	evidence: string[]
	citations: EvidenceCitation[]
	relatedReports: RelatedReportRef[]
	relatedMetrics: RelatedMetricRef[]
	followUpQuestions: string[]
	intentConfidence?: number
	uploadedReports?: unknown[]
}): TrustResponse {
	const disagreements = input.dataAvailable
		? detectReportDisagreements(input.knowledge)
		: []

	const evidenceItems = input.dataAvailable
		? buildTrustEvidenceItems({
				knowledge: input.knowledge,
				uploadedReports: input.uploadedReports,
			})
		: []

	const hasOcrEvidence = evidenceItems.some((item) => Boolean(item.ocrExcerpt))

	const confidence = computeTrustConfidence({
		dataAvailable: input.dataAvailable,
		reportCount: input.knowledge.reports.length,
		metricCount: input.knowledge.metrics.length,
		evidenceItemCount: evidenceItems.length,
		disagreementCount: disagreements.length,
		hasStructuredMetrics: input.knowledge.metrics.length > 0,
		hasOcrEvidence,
		intentConfidence: input.intentConfidence,
	})

	const missingInformation = buildMissingInformation({
		knowledge: input.knowledge,
		dataAvailable: input.dataAvailable,
		question: input.question,
	})

	let directAnswer = input.answer

	if (disagreements.length > 0) {
		const note = disagreements
			.map(
				(item) =>
					`${item.metricName}: ${item.values.map((value) => `${value.value} (${value.reportTitle})`).join(' vs ')}`,
			)
			.join('; ')

		directAnswer = `${directAnswer}\n\nNote — conflicting values in your records: ${note}. ${disagreements[0]!.explanation}`
	}

	if (!directAnswer.includes('not medical advice') && input.dataAvailable) {
		directAnswer = `${directAnswer}\n\n${TRUST_SAFETY_FOOTER}`
	}

	return {
		directAnswer,
		evidence: input.evidence,
		supportingReports: input.relatedReports,
		timelineSummary: buildTimelineSummary(input.knowledge),
		confidence,
		missingInformation,
		disagreements,
		followUpQuestions: input.followUpQuestions,
		evidenceItems,
		explainabilityPrompts: [...EXPLAINABILITY_PROMPTS],
	}
}

export function trustEvidenceToCitations(
	items: TrustEvidenceItem[],
): EvidenceCitation[] {
	return items.map((item) => ({
		reportId: item.reportId,
		reportTitle: item.reportTitle,
		hospital: item.hospital ?? '',
		date: item.reportDate,
		metricName: item.metricName,
		source: item.source,
	}))
}
