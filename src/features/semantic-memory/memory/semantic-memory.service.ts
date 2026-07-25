import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import { buildSemanticMemory } from '@/features/semantic-memory/memory/semantic-memory-builder'
import { formatInsightExplanation } from '@/features/health-insights/utils/insight-mapper'
import { healthInsightsService } from '@/features/health-insights/services/health-insights.service'
import { insightsForIntent } from '@/features/semantic-memory/insights/semantic-insights.engine'
import { formatTimelineForSummary } from '@/features/semantic-memory/timeline/timeline-engine'
import type { SemanticMemory } from '@/features/semantic-memory/types/semantic-memory.types'

export function getSemanticMemory(input: {
	personId: string
	userId: string
	uploadedReports?: UploadedHealthReport[]
}): SemanticMemory {
	const graph = healthKnowledgeService.getGraphForUser(
		input.userId,
		input.uploadedReports ?? [],
	)

	return buildSemanticMemory({
		personId: input.personId,
		graph,
		uploadedReports: input.uploadedReports,
	})
}

export function enrichRetrievedKnowledge(input: {
	knowledge: RetrievedKnowledge
	memory: SemanticMemory
	intent: RetrievedKnowledge['intent']
	categoryId?: string
	userId?: string
	uploadedReports?: UploadedHealthReport[]
}): RetrievedKnowledge {
	const { knowledge, memory, intent, categoryId } = input
	const scopedHistories = categoryId
		? memory.metricHistories.filter(
				(history) => history.categoryId === categoryId,
			)
		: memory.metricHistories

	const filteredTimeline = categoryId
		? memory.timeline
				.map((group) => ({
					...group,
					events: group.events.filter(
						(event) => !event.categoryId || event.categoryId === categoryId,
					),
				}))
				.filter((group) => group.events.length > 0)
		: memory.timeline

	const semanticInsights = insightsForIntent(memory.insights, intent).filter(
		(item) =>
			!categoryId ||
			item.categoryId === categoryId ||
			item.text.toLowerCase().includes(categoryId),
	)
	const insightTexts = semanticInsights.map((item) => item.text)
	const timelineSummary = formatTimelineForSummary(filteredTimeline)

	const summaryLines = buildSemanticSummaryLines({
		intent,
		knowledge,
		timelineSummary,
		insightTexts,
		memory,
		categoryId,
		scopedHistories,
	})

	const proactiveInsights =
		input.userId && input.uploadedReports
			? healthInsightsService.getAskInsights({
					userId: input.userId,
					uploadedReports: input.uploadedReports,
					intent,
					categoryId,
				})
			: []

	const proactiveTexts = proactiveInsights.map((item) =>
		formatInsightExplanation(item),
	)

	const shouldPrependProactive = proactiveTexts.length > 0 && !categoryId

	return {
		...knowledge,
		metrics: categoryId
			? knowledge.metrics.filter((metric) => metric.categoryId === categoryId)
			: knowledge.metrics,
		relationships: memory.relationships.map((relationship) => ({
			id: relationship.id,
			fromMetricId: relationship.fromEntityId.replace(/^metric:/, ''),
			toMetricId: relationship.toEntityId.replace(/^metric:/, ''),
			label: relationship.label,
		})),
		insights: [
			...new Set([
				...(categoryId ? [] : proactiveTexts),
				...insightTexts,
				...knowledge.insights.filter((line) =>
					categoryId ? line.toLowerCase().includes(categoryId) : true,
				),
			]),
		].slice(0, 10),
		summaryLines: shouldPrependProactive
			? [...proactiveTexts.slice(0, 4), ...summaryLines].slice(0, 8)
			: summaryLines.length > 0
				? summaryLines
				: knowledge.summaryLines,
		semanticTimeline: filteredTimeline,
		metricHistories: scopedHistories,
	}
}

function buildSemanticSummaryLines(input: {
	intent: RetrievedKnowledge['intent']
	knowledge: RetrievedKnowledge
	timelineSummary: string[]
	insightTexts: string[]
	memory: SemanticMemory
	categoryId?: string
	scopedHistories: SemanticMemory['metricHistories']
}): string[] {
	const lines: string[] = []

	switch (input.intent) {
		case 'health_journey':
		case 'summarize_report':
		case 'summarize_health':
			lines.push(...input.timelineSummary.slice(0, 5))
			break
		case 'attention_summary':
		case 'since_last_report':
			lines.push(...input.insightTexts.slice(0, 5))
			break
		case 'resolved_findings':
			lines.push(
				...input.insightTexts.filter((text) =>
					/normalized|resolved/i.test(text),
				),
			)
			break
		case 'metric_trend':
		case 'metric_history':
			for (const history of input.memory.metricHistories.slice(0, 4)) {
				lines.push(
					`${history.displayName}: ${history.previousValue ?? '—'} → ${history.latestValue} (${history.trendDirection}, ${history.changePercent})`,
				)
			}
			break
		case 'compare_reports':
			lines.push(...input.timelineSummary.slice(-2))
			break
		case 'organ_status':
			if (input.scopedHistories.length > 0) {
				lines.push(
					...input.scopedHistories
						.slice(0, 4)
						.map(
							(history) =>
								`${history.displayName}: latest ${history.latestValue} (${history.latestStatus})`,
						),
				)
			} else if (input.categoryId) {
				lines.push(
					`No ${input.categoryId} markers were found in your records yet.`,
				)
			}
			break
		default:
			if (input.timelineSummary.length > 0) {
				lines.push(input.timelineSummary[input.timelineSummary.length - 1]!)
			}
			lines.push(...input.insightTexts.slice(0, 3))
			break
	}

	return lines.filter(Boolean)
}

export const semanticMemoryService = {
	getSemanticMemory,
	enrichRetrievedKnowledge,
}
