import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { getReportDisplayTitle } from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'
import { healthKnowledgeRetriever } from '@/features/knowledge/retrieval/health-knowledge-retriever'
import {
	extractTextSnippet,
	mergeSearchHits,
	scoreTextMatch,
	tokenizeQuery,
} from '@/features/intelligence/services/semantic-search.service'
import type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderContext,
	KnowledgeProviderResult,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'

function searchHealthReports(input: {
	question: string
	reports: UploadedHealthReport[]
}): SemanticSearchHit[] {
	const queryTokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []

	for (const report of input.reports) {
		if (report.status !== 'completed') {
			continue
		}

		const parsed = getParsedHealthReport(report)
		const title = getReportDisplayTitle(report)
		const lab = parsed?.metadata.laboratory ?? ''
		const reportDate = report.report_date ?? report.uploaded_at
		const reportType = parsed?.metadata.reportType ?? report.report_type ?? ''
		const memberId = report.family_member_id ?? null
		const body = [
			title,
			lab,
			parsed?.metadata.reportType ?? '',
			report.extracted_text ?? '',
			...(parsed?.metrics.map(
				(metric) => `${metric.displayName} ${metric.value}`,
			) ?? []),
		].join(' ')

		const reportScore = scoreTextMatch(queryTokens, body)

		if (reportScore > 0) {
			hits.push({
				id: `report-${report.id}`,
				domain: 'health',
				kind: 'report',
				title,
				snippet: lab ? `${title} · ${lab}` : title,
				score: reportScore,
				reportId: report.id,
				date: reportDate,
				reportType,
				memberId,
			})
		}

		if (report.extracted_text) {
			const ocrScore = scoreTextMatch(queryTokens, report.extracted_text)

			if (ocrScore > 0) {
				hits.push({
					id: `ocr-${report.id}`,
					domain: 'health',
					kind: 'entity',
					title: `${title} (OCR)`,
					snippet: extractTextSnippet(report.extracted_text, queryTokens),
					score: ocrScore + 0.25,
					reportId: report.id,
					date: reportDate,
					reportType,
					memberId,
				})
			}
		}

		for (const metric of parsed?.metrics ?? []) {
			const metricText = `${metric.displayName} ${metric.value} ${metric.referenceRange.rawText ?? ''}`
			const metricScore = scoreTextMatch(queryTokens, metricText)

			if (metricScore > 0) {
				hits.push({
					id: `metric-${report.id}-${metric.displayName}`,
					domain: 'health',
					kind: 'metric',
					title: metric.displayName,
					snippet: `${metric.displayName}: ${metric.value}`,
					score: metricScore,
					reportId: report.id,
					metricName: metric.displayName,
					date: reportDate,
					reportType,
					memberId,
				})

				hits.push({
					id: `timeline-${report.id}-${metric.displayName}`,
					domain: 'health',
					kind: 'timeline',
					title: `${metric.displayName} timeline`,
					snippet: `${metric.displayName} recorded in ${title}`,
					score: metricScore * 0.85,
					reportId: report.id,
					metricName: metric.displayName,
					date: reportDate,
					reportType,
					memberId,
				})
			}
		}
	}

	return mergeSearchHits(hits)
}

export class HealthKnowledgeProvider implements ChronicleKnowledgeProvider {
	readonly domain = 'health' as const
	readonly label = 'Health'

	isAvailable(context: KnowledgeProviderContext): boolean {
		return (context.uploadedReports?.length ?? 0) > 0
	}

	search(context: KnowledgeProviderContext): SemanticSearchHit[] {
		return searchHealthReports({
			question: context.resolvedQuestion,
			reports: context.uploadedReports ?? [],
		})
	}

	retrieve(context: KnowledgeProviderContext): KnowledgeProviderResult {
		if (!this.isAvailable(context)) {
			return {
				domain: 'health',
				available: false,
				knowledge: null,
				unavailableReason:
					'No health records are available for this family member yet.',
			}
		}

		const knowledge = healthKnowledgeRetriever.retrieve({
			userId: context.userId,
			question: context.question,
			intent: context.intent,
			resolvedQuestion: context.resolvedQuestion,
			categoryId: context.categoryId,
			metricId: context.metricId,
			metricName: context.metricName,
			timeRangeYears: context.timeRangeYears,
			uploadedReports: context.uploadedReports,
			searchHits: context.searchHits,
			member: context.member,
		})

		const healthHits =
			context.searchHits?.filter((hit) => hit.domain === 'health') ?? []

		if (healthHits.length > 0 && knowledge.summaryLines.length === 0) {
			knowledge.summaryLines.push(
				`Found ${healthHits.length} related item${healthHits.length === 1 ? '' : 's'} in your health records.`,
			)
		}

		return {
			domain: 'health',
			available: true,
			knowledge,
		}
	}
}

export const healthKnowledgeProvider = new HealthKnowledgeProvider()
