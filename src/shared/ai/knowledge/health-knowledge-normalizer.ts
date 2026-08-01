import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { NormalizedKnowledge } from '@/shared/ai/types/knowledge.types'

export function healthKnowledgeToNormalized(
	knowledge: HealthKnowledge,
	intent: string,
	question: string,
): NormalizedKnowledge {
	return {
		domain: 'health',
		intent,
		question,
		reports: [
			...(knowledge.latestReport ? [knowledge.latestReport] : []),
			...knowledge.previousReports,
		].map((report) => ({
			id: report.id,
			title: report.title,
			date: report.date,
			lab: report.lab,
			summary: knowledge.summary.headline,
		})),
		metrics: knowledge.metrics.map((metric) => ({
			id: metric.id,
			displayName: metric.displayName,
			value: metric.value,
			unit: metric.unit,
			status: metric.status,
			categoryId: metric.categoryId,
			reportId: metric.reportId,
			observedAt: metric.observedAt,
		})),
		insights: knowledge.insights.map((item) => item.text),
		alerts: knowledge.criticalMetrics.map(
			(metric) => `${metric.displayName}: ${metric.value}`,
		),
		evidence: knowledge.sources.map((source) => ({
			id: source.id,
			sourceType: source.type,
			label: source.label,
			date: source.date,
		})),
		summaryLines: knowledge.summary.lines,
		coverageNotes: knowledge.limitations.map((item) => item.message),
		dataAvailable:
			knowledge.latestReport != null || knowledge.metrics.length > 0,
	}
}
