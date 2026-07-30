import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { getReportDisplayTitle } from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'
import { healthKnowledgeRetriever } from '@/features/knowledge/retrieval/health-knowledge-retriever'
import type { RetrievalQuery } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type {
	ChronicleKnowledgeProvider,
	KnowledgeContextPackage,
	KnowledgeDocument,
	KnowledgeMetric,
	KnowledgeReference,
	KnowledgeTimelineEvent,
	KnowledgeProviderQuery,
	ProviderContextResult,
	SemanticSearchHit,
} from '@chronicle/core-knowledge'
import { fromRetrievedKnowledge } from '@chronicle/core-knowledge'
import {
	extractTextSnippet,
	mergeSearchHits,
	registerKnowledgeProvider,
	scoreTextMatch,
	tokenizeQuery,
} from '@chronicle/core-search'

const PROVIDER_ID = 'health'

export interface HealthProviderSource {
	uploadedReports?: UploadedHealthReport[]
}

function getHealthReports(
	query: KnowledgeProviderQuery,
): UploadedHealthReport[] {
	const source = query.sources[PROVIDER_ID] as HealthProviderSource | undefined
	return source?.uploadedReports ?? []
}

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
		const doctor = parsed?.metadata.doctorName ?? ''
		const testNames = (parsed?.metadata.testNames ?? []).join(' ')
		const reportDate = report.report_date ?? report.uploaded_at
		const reportType = parsed?.metadata.reportType ?? report.report_type ?? ''
		const memberId = report.family_member_id ?? null
		const body = [
			title,
			lab,
			doctor,
			testNames,
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
				snippet: [lab, doctor, reportType].filter(Boolean).join(' · ') || title,
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

function toRetrievalQuery(query: KnowledgeProviderQuery): RetrievalQuery {
	return {
		userId: query.userId,
		question: query.question,
		intent: query.intent,
		resolvedQuestion: query.resolvedQuestion,
		categoryId: query.categoryId,
		metricId: query.metricId,
		metricName: query.metricName,
		timeRangeYears: query.timeRangeYears,
		uploadedReports: getHealthReports(query),
		searchHits: query.searchHits,
		member: query.member,
		sources: query.sources,
	}
}

function loadHealthPackage(
	query: KnowledgeProviderQuery,
): KnowledgeContextPackage {
	const knowledge = healthKnowledgeRetriever.retrieve(toRetrievalQuery(query))
	const pkg = fromRetrievedKnowledge(knowledge, PROVIDER_ID)

	const healthHits =
		query.searchHits?.filter((hit) => hit.domain === 'health') ?? []

	if (healthHits.length > 0 && pkg.summaryLines.length === 0) {
		pkg.summaryLines.push(
			`Found ${healthHits.length} related item${healthHits.length === 1 ? '' : 's'} in your health records.`,
		)
	}

	return pkg
}

export class HealthKnowledgeProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'health' as const
	readonly label = 'Health'
	readonly priority = 10

	supports(query: KnowledgeProviderQuery): boolean {
		return getHealthReports(query).length > 0
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		return searchHealthReports({
			question: query.resolvedQuestion,
			reports: getHealthReports(query),
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		if (!this.supports(query)) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason:
					'No health records are available for this family member yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: loadHealthPackage(query),
		}
	}

	retrieveTimeline(query: KnowledgeProviderQuery): KnowledgeTimelineEvent[] {
		if (!this.supports(query)) {
			return []
		}

		return loadHealthPackage(query).timelineEvents
	}

	retrieveEntities(query: KnowledgeProviderQuery): KnowledgeDocument[] {
		if (!this.supports(query)) {
			return []
		}

		return loadHealthPackage(query).documents
	}

	retrieveMetrics(query: KnowledgeProviderQuery): KnowledgeMetric[] {
		if (!this.supports(query)) {
			return []
		}

		return loadHealthPackage(query).metrics
	}

	retrieveEvidence(query: KnowledgeProviderQuery): KnowledgeReference[] {
		if (!this.supports(query)) {
			return []
		}

		return loadHealthPackage(query).references
	}
}

export const healthKnowledgeProvider = new HealthKnowledgeProvider()

registerKnowledgeProvider(healthKnowledgeProvider)
