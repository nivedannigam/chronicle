import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	buildLatestReportComparison,
	detectReportChanges,
	reportDateForId,
	reportTitleForId,
} from '@/features/health-insights/engines/change-detection.engine'
import { buildHealthScorecard } from '@/features/health-insights/engines/health-scorecard.engine'
import type {
	ChronicleInsight,
	DetectedChange,
	HealthScorecard,
	InsightCategory,
	InsightConfidence,
	InsightSeverity,
} from '@/features/health-insights/types/health-insights.types'
import {
	INSIGHT_SAFETY_DISCLAIMER,
	MIN_EVIDENCE_FOR_INSIGHT,
} from '@/features/health-insights/types/health-insights.types'
import { buildSemanticMemory } from '@/features/semantic-memory/memory/semantic-memory-builder'
import { generateLongTermTrendInsights } from '@/features/health-intelligence/engines/long-term-trend.engine'
import type { SemanticInsight } from '@/features/semantic-memory/types/semantic-memory.types'

export interface HealthInsightsResult {
	insights: ChronicleInsight[]
	scorecard: HealthScorecard
}

function confidenceFromDataPoints(count: number): InsightConfidence {
	if (count >= 3) {
		return 'high'
	}

	if (count >= 2) {
		return 'medium'
	}

	return 'low'
}

function categoryForChange(change: DetectedChange): InsightCategory {
	switch (change.kind) {
		case 'improved':
			return 'positive_progress'
		case 'resolved':
		case 'resolved_finding':
			return 'positive_progress'
		case 'new_finding':
		case 'worsening':
		case 'persistent':
			return change.kind === 'new_finding'
				? 'recently_changed'
				: 'areas_to_watch'
		default:
			return 'recently_changed'
	}
}

function severityForChange(change: DetectedChange): InsightSeverity {
	switch (change.kind) {
		case 'improved':
		case 'resolved':
			return 'positive'
		case 'persistent':
		case 'worsening':
			return 'attention'
		default:
			return 'info'
	}
}

function insightFromChange(
	change: DetectedChange,
	uploadedReports: UploadedHealthReport[],
	historyCount: number,
): ChronicleInsight | null {
	const evidence = [
		{
			reportId: change.reportId,
			reportTitle: reportTitleForId(change.reportId, uploadedReports),
			metricName: change.displayName,
			date: reportDateForId(change.reportId, uploadedReports),
			snippet:
				change.previousValue && change.currentValue
					? `${change.previousValue} → ${change.currentValue}`
					: change.currentValue,
		},
	]

	if (change.previousReportId) {
		evidence.push({
			reportId: change.previousReportId,
			reportTitle: reportTitleForId(change.previousReportId, uploadedReports),
			metricName: change.displayName,
			date: reportDateForId(change.previousReportId, uploadedReports),
			snippet: change.previousValue,
		})
	}

	if (evidence.length < MIN_EVIDENCE_FOR_INSIGHT) {
		return null
	}

	const confidence = confidenceFromDataPoints(historyCount)

	if (confidence === 'low' && change.kind !== 'new_finding') {
		return null
	}

	return {
		id: change.id,
		domain: 'health',
		category: categoryForChange(change),
		title: change.description,
		summary: buildChangeSummary(change),
		why: buildChangeWhy(change),
		evidence,
		confidence,
		severity: severityForChange(change),
		timelineRefs: [change.observedAt.slice(0, 4)],
		metricId: change.metricId,
		beganAt: change.observedAt,
	}
}

function buildChangeSummary(change: DetectedChange): string {
	if (change.previousValue && change.currentValue) {
		return `${change.displayName} changed from ${change.previousValue} to ${change.currentValue}.`
	}

	return `${change.displayName} is ${change.currentValue ?? 'noted'} in your latest records.`
}

function buildChangeWhy(change: DetectedChange): string {
	switch (change.kind) {
		case 'improved':
			return `Chronicle compared your latest readings and found ${change.displayName} trending better than before.`
		case 'worsening':
			return `Your most recent reports show ${change.displayName} moving in an unfavorable direction.`
		case 'resolved':
			return `Earlier reports flagged ${change.displayName}; your latest value is back within the normal range recorded in Chronicle.`
		case 'persistent':
			return `Multiple reports in Chronicle show ${change.displayName} remaining outside the normal range.`
		case 'new_finding':
			return `This metric was within range previously and is now flagged in your latest report.`
		default:
			return `Based on sequential reports stored in Chronicle.`
	}
}

function insightFromSemantic(
	semantic: SemanticInsight,
	uploadedReports: UploadedHealthReport[],
): ChronicleInsight | null {
	if (semantic.evidenceReportIds.length === 0 && semantic.kind !== 'summary') {
		return null
	}

	const category = mapSemanticCategory(semantic.kind)
	const evidence = semantic.evidenceReportIds.map((reportId) => ({
		reportId,
		reportTitle: reportTitleForId(reportId, uploadedReports),
		date: reportDateForId(reportId, uploadedReports),
		metricName: semantic.metricId,
	}))

	return {
		id: `semantic-${semantic.id}`,
		domain: 'health',
		category,
		title: semanticTitle(semantic),
		summary: semantic.text,
		why: semanticWhy(semantic),
		evidence,
		confidence:
			evidence.length >= 2 ? 'high' : evidence.length === 1 ? 'medium' : 'low',
		severity: mapSemanticSeverity(semantic.kind),
		timelineRefs: [],
		metricId: semantic.metricId,
		categoryId: semantic.categoryId,
	}
}

function mapSemanticCategory(kind: SemanticInsight['kind']): InsightCategory {
	switch (kind) {
		case 'improving_trend':
			return 'positive_progress'
		case 'resolved_abnormality':
			return 'positive_progress'
		case 'new_abnormality':
			return 'recently_changed'
		case 'persistent_trend':
			return 'long_term_trends'
		case 'missing_follow_up':
			return 'missing_information'
		default:
			return 'areas_to_watch'
	}
}

function mapSemanticSeverity(kind: SemanticInsight['kind']): InsightSeverity {
	switch (kind) {
		case 'improving_trend':
		case 'resolved_abnormality':
			return 'positive'
		case 'new_abnormality':
		case 'persistent_trend':
			return 'attention'
		default:
			return 'info'
	}
}

function semanticTitle(semantic: SemanticInsight): string {
	switch (semantic.kind) {
		case 'improving_trend':
			return 'Improving trend'
		case 'resolved_abnormality':
			return 'Resolved finding'
		case 'new_abnormality':
			return 'New abnormality'
		case 'persistent_trend':
			return 'Long-term trend'
		case 'missing_follow_up':
			return 'Missing follow-up'
		default:
			return 'Health summary'
	}
}

function semanticWhy(semantic: SemanticInsight): string {
	switch (semantic.kind) {
		case 'missing_follow_up':
			return 'Chronicle noticed a gap since this metric was last measured in your uploaded reports.'
		case 'improving_trend':
			return 'Multiple readings over time show a consistent improvement pattern.'
		default:
			return 'Derived from normalized metric history across your Chronicle records.'
	}
}

function insightForDoctorDiscussion(
	graph: HealthKnowledgeGraph,
	uploadedReports: UploadedHealthReport[],
): ChronicleInsight[] {
	const alerts = graph.profile.alerts.slice(0, 3)

	return alerts.map((alert) => ({
		id: `doctor-${alert.id}`,
		domain: 'health',
		category: 'doctor_discussion' as const,
		title: 'Topic for your doctor',
		summary: alert.message,
		why: 'This item is flagged in your Chronicle health knowledge graph.',
		evidence: [
			{
				reportId: alert.reportId,
				reportTitle: reportTitleForId(alert.reportId, uploadedReports),
				date: alert.observedAt,
			},
		],
		confidence: 'high' as const,
		severity: alert.severity === 'critical' ? 'attention' : 'info',
		timelineRefs: [alert.observedAt.slice(0, 4)],
		metricId: alert.metricId,
		beganAt: alert.observedAt,
	}))
}

function rankInsights(insights: ChronicleInsight[]): ChronicleInsight[] {
	const severityWeight: Record<InsightSeverity, number> = {
		attention: 3,
		info: 2,
		positive: 1,
	}
	const confidenceWeight: Record<InsightConfidence, number> = {
		high: 3,
		medium: 2,
		low: 1,
	}

	return [...insights].sort((left, right) => {
		const leftScore =
			severityWeight[left.severity] * 10 + confidenceWeight[left.confidence]
		const rightScore =
			severityWeight[right.severity] * 10 + confidenceWeight[right.confidence]

		return rightScore - leftScore
	})
}

export function generateHealthInsights(input: {
	userId: string
	uploadedReports: UploadedHealthReport[]
	graph: HealthKnowledgeGraph
	limit?: number
}): HealthInsightsResult {
	const memory = buildSemanticMemory({
		personId: input.userId,
		graph: input.graph,
		uploadedReports: input.uploadedReports,
	})

	const changes = detectReportChanges({
		histories: input.graph.profile.metricHistories,
		uploadedReports: input.uploadedReports,
	})

	const latestChanges = buildLatestReportComparison({
		uploadedReports: input.uploadedReports,
		changes,
	})

	const insightMap = new Map<string, ChronicleInsight>()

	for (const change of [...latestChanges, ...changes]) {
		const history = input.graph.profile.metricHistories.find(
			(item) => item.canonicalMetricId === change.metricId,
		)
		const insight = insightFromChange(
			change,
			input.uploadedReports,
			history?.observations.length ?? 1,
		)

		if (insight) {
			insightMap.set(insight.id, insight)
		}
	}

	for (const semantic of memory.insights) {
		const insight = insightFromSemantic(semantic, input.uploadedReports)

		if (insight && insight.confidence !== 'low') {
			insightMap.set(insight.id, insight)
		}
	}

	for (const doctorInsight of insightForDoctorDiscussion(
		input.graph,
		input.uploadedReports,
	)) {
		insightMap.set(doctorInsight.id, doctorInsight)
	}

	for (const longTerm of generateLongTermTrendInsights(
		input.graph.profile.metricHistories,
	)) {
		if (!insightMap.has(longTerm.id)) {
			insightMap.set(longTerm.id, longTerm)
		}
	}

	const insights = rankInsights([...insightMap.values()]).slice(
		0,
		input.limit ?? 12,
	)

	return {
		insights,
		scorecard: buildHealthScorecard(input.graph),
	}
}

export function insightsForAskIntent(
	insights: ChronicleInsight[],
	intent: string,
	categoryId?: string,
): ChronicleInsight[] {
	const scoped = categoryId
		? insights.filter(
				(item) =>
					item.categoryId === categoryId ||
					item.title.toLowerCase().includes(categoryId) ||
					item.summary.toLowerCase().includes(categoryId),
			)
		: insights

	switch (intent) {
		case 'organ_status':
			return scoped.length > 0 ? scoped.slice(0, 4) : []
		case 'attention_summary':
		case 'abnormal_reports':
			return (categoryId ? scoped : insights).filter(
				(item) =>
					item.category === 'areas_to_watch' ||
					item.category === 'recently_changed',
			)
		case 'improving_metrics':
			return insights.filter((item) => item.category === 'positive_progress')
		case 'compare_reports':
		case 'since_last_report':
			return insights.filter((item) => item.category === 'recently_changed')
		case 'doctor_discussion':
			return insights.filter((item) => item.category === 'doctor_discussion')
		case 'health_journey':
		case 'summarize_health':
			return insights.slice(0, 8)
		case 'resolved_findings':
			return insights.filter(
				(item) =>
					item.title.toLowerCase().includes('resolved') ||
					item.summary.toLowerCase().includes('normalized'),
			)
		default:
			return insights.slice(0, 6)
	}
}

export { INSIGHT_SAFETY_DISCLAIMER }
