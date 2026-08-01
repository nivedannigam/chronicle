import { estimateEvidenceTokens } from '@/shared/ai/evidence/token-estimator'
import type {
	EvidenceItem,
	EvidenceSelector,
	SelectedEvidence,
} from '@/shared/ai/evidence/evidence.types'
import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type {
	HealthKnowledge,
	HealthKnowledgeMetric,
	HealthKnowledgeReportRef,
} from '@/features/health-knowledge/types/health-knowledge-object.types'

function reportRef(report: HealthKnowledgeReportRef): Record<string, unknown> {
	return {
		id: report.id,
		title: report.title,
		date: report.date,
		lab: report.lab,
		metricCount: report.metricCount,
		badgeStatus: report.badgeStatus,
	}
}

function metricRef(metric: HealthKnowledgeMetric): Record<string, unknown> {
	return {
		id: metric.id,
		canonicalId: metric.canonicalId,
		displayName: metric.displayName,
		value: metric.value,
		unit: metric.unit,
		status: metric.status,
		referenceRange: metric.referenceRange,
		confidence: metric.confidence,
		reportId: metric.reportId,
		observedAt: metric.observedAt,
	}
}

function matchMetrics(
	knowledge: HealthKnowledge,
	metricIds: string[],
	metricNames: string[],
): HealthKnowledgeMetric[] {
	if (metricIds.length === 0 && metricNames.length === 0) {
		return []
	}

	const idSet = new Set(metricIds)
	const nameSet = new Set(metricNames.map((name) => name.toLowerCase()))

	return knowledge.metrics.filter(
		(metric) =>
			idSet.has(metric.canonicalId) ||
			nameSet.has(metric.displayName.toLowerCase()) ||
			[...nameSet].some((name) =>
				metric.displayName.toLowerCase().includes(name),
			),
	)
}

function latestReportMetrics(
	knowledge: HealthKnowledge,
): HealthKnowledgeMetric[] {
	if (!knowledge.latestReport) {
		return []
	}

	return knowledge.metrics
		.filter((metric) => metric.reportId === knowledge.latestReport?.id)
		.sort((a, b) => b.clinicalScore - a.clinicalScore)
		.slice(0, 8)
}

function topFindings(
	knowledge: HealthKnowledge,
	limit = 6,
): HealthKnowledgeMetric[] {
	return [...knowledge.metrics]
		.sort((a, b) => b.clinicalScore - a.clinicalScore)
		.slice(0, limit)
}

function buildItems(
	intent: ChronicleIntent,
	knowledge: HealthKnowledge,
	input: {
		question: string
		metricIds: string[]
		metricNames: string[]
	},
): { items: EvidenceItem[]; excluded: string[]; selectedKeys: string[] } {
	const items: EvidenceItem[] = []
	const excluded: string[] = []
	const selectedKeys: string[] = []
	const matched = matchMetrics(knowledge, input.metricIds, input.metricNames)

	const add = (
		key: string,
		type: string,
		label: string,
		data: Record<string, unknown> | object,
	) => {
		items.push({
			id: key,
			type,
			label,
			data: data as Record<string, unknown>,
		})
		selectedKeys.push(key)
	}

	switch (intent) {
		case 'LATEST_REPORT': {
			if (knowledge.latestReport) {
				add(
					`report-${knowledge.latestReport.id}`,
					'health_report',
					knowledge.latestReport.title,
					reportRef(knowledge.latestReport),
				)
			}

			for (const metric of latestReportMetrics(knowledge)) {
				add(
					`metric-${metric.id}`,
					'health_metric',
					metric.displayName,
					metricRef(metric),
				)
			}

			add('summary', 'health_summary', 'Report summary', {
				headline: knowledge.summary.headline,
				lines: knowledge.summary.lines.slice(0, 4),
			})

			excluded.push(
				'previousReports',
				'normalMetrics',
				'fullTimeline',
				'allRecommendations',
			)
			break
		}

		case 'GENERAL_HEALTH_SUMMARY': {
			if (knowledge.latestReport) {
				add(
					`report-${knowledge.latestReport.id}`,
					'health_report',
					knowledge.latestReport.title,
					reportRef(knowledge.latestReport),
				)
			}

			for (const metric of topFindings(knowledge, 5)) {
				add(
					`metric-${metric.id}`,
					'health_metric',
					metric.displayName,
					metricRef(metric),
				)
			}

			add('summary', 'health_summary', 'Health summary', {
				headline: knowledge.summary.headline,
				lines: knowledge.summary.lines.slice(0, 3),
				healthScore: knowledge.healthScore,
			})

			add('confidence', 'confidence', 'Confidence', knowledge.confidence)

			excluded.push('previousReports', 'allMetrics', 'fullTimeline')
			break
		}

		case 'ABNORMAL_RESULTS': {
			for (const metric of knowledge.abnormalMetrics.slice(0, 10)) {
				add(
					`metric-${metric.id}`,
					'health_metric',
					metric.displayName,
					metricRef(metric),
				)
			}

			for (const rec of knowledge.recommendations.slice(0, 4)) {
				add(`rec-${rec.id}`, 'recommendation', rec.text, {
					text: rec.text,
					priority: rec.priority,
				})
			}

			if (knowledge.latestReport) {
				add(
					`report-${knowledge.latestReport.id}`,
					'health_report',
					knowledge.latestReport.title,
					reportRef(knowledge.latestReport),
				)
			}

			excluded.push('normalMetrics', 'previousReports', 'fullTrendAnalysis')
			break
		}

		case 'NORMAL_RESULTS': {
			const pool =
				matched.length > 0
					? matched.filter((metric) => metric.status === 'normal')
					: knowledge.normalMetrics

			for (const metric of pool.slice(0, 10)) {
				add(
					`metric-${metric.id}`,
					'health_metric',
					metric.displayName,
					metricRef(metric),
				)
			}

			excluded.push('abnormalMetrics', 'previousReports', 'recommendations')
			break
		}

		case 'SPECIFIC_METRIC':
		case 'EXPLAIN_METRIC': {
			const metrics = matched.length > 0 ? matched : topFindings(knowledge, 1)

			for (const metric of metrics.slice(0, 4)) {
				add(
					`metric-${metric.id}`,
					'health_metric',
					metric.displayName,
					metricRef(metric),
				)
			}

			const trends = knowledge.trendAnalysis.filter((trend) =>
				metrics.some((metric) => metric.canonicalId === trend.metricId),
			)

			for (const trend of trends.slice(0, 2)) {
				add(`trend-${trend.metricId}`, 'trend', trend.displayName, trend)
			}

			const reportId = metrics[0]?.reportId ?? knowledge.latestReport?.id
			const report =
				knowledge.latestReport?.id === reportId
					? knowledge.latestReport
					: knowledge.previousReports.find((item) => item.id === reportId)

			if (report) {
				add(
					`report-${report.id}`,
					'health_report',
					report.title,
					reportRef(report),
				)
			}

			excluded.push('unrelatedMetrics', 'previousReports', 'fullTimeline')
			break
		}

		case 'TREND_ANALYSIS': {
			const trends =
				matched.length > 0
					? knowledge.trendAnalysis.filter((trend) =>
							matched.some((metric) => metric.canonicalId === trend.metricId),
						)
					: knowledge.trendAnalysis.filter((trend) => trend.isActionable)

			for (const trend of trends.slice(0, 6)) {
				add(`trend-${trend.metricId}`, 'trend', trend.displayName, trend)
			}

			for (const metric of matched.slice(0, 4)) {
				add(
					`metric-${metric.id}`,
					'health_metric',
					metric.displayName,
					metricRef(metric),
				)
			}

			excluded.push('staticSnapshotOnly', 'recommendations', 'fullReportList')
			break
		}

		case 'COMPARE_REPORTS': {
			if (knowledge.latestReport) {
				add(
					`report-${knowledge.latestReport.id}`,
					'health_report',
					knowledge.latestReport.title,
					reportRef(knowledge.latestReport),
				)
			}

			for (const report of knowledge.previousReports.slice(0, 3)) {
				add(
					`report-${report.id}`,
					'health_report',
					report.title,
					reportRef(report),
				)
			}

			const comparableTrends = knowledge.trendAnalysis.filter(
				(trend) => trend.dataPointCount >= 2,
			)

			for (const trend of comparableTrends.slice(0, 8)) {
				add(`trend-${trend.metricId}`, 'trend', trend.displayName, trend)
			}

			for (const metric of matched.slice(0, 4)) {
				add(
					`metric-${metric.id}`,
					'health_metric',
					metric.displayName,
					metricRef(metric),
				)
			}

			excluded.push('normalMetrics', 'qualitativeOnly', 'fullInsights')
			break
		}

		case 'RECOMMENDATIONS': {
			for (const rec of knowledge.recommendations.slice(0, 6)) {
				add(`rec-${rec.id}`, 'recommendation', rec.text, rec)
			}

			for (const limitation of knowledge.limitations.slice(0, 4)) {
				add(
					`lim-${limitation.code}`,
					'limitation',
					limitation.message,
					limitation,
				)
			}

			excluded.push('fullMetrics', 'previousReports', 'timeline')
			break
		}

		case 'FOLLOW_UP_TESTS': {
			for (const rec of knowledge.recommendations.filter((item) =>
				/test|panel|retest|follow/i.test(item.text),
			)) {
				add(`rec-${rec.id}`, 'recommendation', rec.text, rec)
			}

			for (const limitation of knowledge.limitations.filter((item) =>
				/missing|panel|lipid|thyroid|diabetes/i.test(item.message),
			)) {
				add(
					`lim-${limitation.code}`,
					'limitation',
					limitation.message,
					limitation,
				)
			}

			excluded.push('fullMetrics', 'timeline', 'normalMetrics')
			break
		}

		default: {
			if (knowledge.latestReport) {
				add(
					`report-${knowledge.latestReport.id}`,
					'health_report',
					knowledge.latestReport.title,
					reportRef(knowledge.latestReport),
				)
			}

			add('summary', 'health_summary', 'Summary', {
				headline: knowledge.summary.headline,
			})

			add('confidence', 'confidence', 'Confidence', {
				overall: knowledge.confidence.overall,
			})

			excluded.push('fullKnowledgeGraph')
			break
		}
	}

	return { items, excluded, selectedKeys }
}

export class HealthEvidenceSelector implements EvidenceSelector<HealthKnowledge> {
	readonly domain = 'health' as const

	select(input: {
		knowledge: HealthKnowledge
		intent: ChronicleIntent
		question: string
		metricIds?: string[]
		metricNames?: string[]
		timeRangeYears?: number
	}): SelectedEvidence {
		const metricIds = input.metricIds ?? []
		const metricNames = input.metricNames ?? []
		const { items, excluded, selectedKeys } = buildItems(
			input.intent,
			input.knowledge,
			{
				question: input.question,
				metricIds,
				metricNames,
			},
		)

		const payload = {
			intent: input.intent,
			familyMember: {
				displayName: input.knowledge.familyMember.displayName,
			},
			evidence: items.map((item) => ({
				id: item.id,
				type: item.type,
				label: item.label,
				data: item.data,
			})),
			limitations: input.knowledge.limitations
				.slice(0, 3)
				.map((item) => item.message),
		}

		const contextSizeChars = JSON.stringify(payload).length
		const estimatedTokens = estimateEvidenceTokens({
			payload,
			question: input.question,
		})

		return {
			domain: 'health',
			intent: input.intent,
			question: input.question,
			items,
			metadata: {
				evidenceCount: items.length,
				excludedItems: excluded,
				estimatedTokens,
				contextSizeChars,
				selectedKeys,
			},
		}
	}
}

export const healthEvidenceSelector = new HealthEvidenceSelector()
