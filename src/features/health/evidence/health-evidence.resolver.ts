import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import {
	applyBudget,
	budgetForQuestionType,
} from '@/features/health/evidence/health-evidence.budget'
import {
	buildTemporalMetrics,
	gatherCandidateReports,
	gatherCandidateTimeline,
	gatherCandidateTrends,
	gatherScopedMetrics,
	metricModeForQuestionType,
	resolveScope,
	sortedReports,
	toBundleReport,
	toBundleTimelineEvent,
	toBundleTrend,
} from '@/features/health/evidence/health-evidence.assembly'
import { inferSubjectScope } from '@/features/health/evidence/health-evidence.scope'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'

const RESOLVER_ID = 'health.evidence_resolver.v1'

function buildSummary(knowledge: HealthKnowledge) {
	return {
		headline: knowledge.summary.headline,
		lines: knowledge.summary.lines,
		healthScore: knowledge.healthScore,
		limitations: knowledge.limitations.map((item) => item.message),
	}
}

function assembleBundle(input: {
	knowledge: HealthKnowledge
	request: EvidenceRequest
	metrics: ReturnType<typeof buildTemporalMetrics>
	reports: ReturnType<typeof gatherCandidateReports>
	trends: ReturnType<typeof gatherCandidateTrends>
	timeline: ReturnType<typeof gatherCandidateTimeline>
	excluded: string[]
}): EvidenceBundle {
	const budget = budgetForQuestionType(input.request.questionType)

	if (input.request.questionType === 'LATEST_REPORT') {
		const latestReportId = input.knowledge.latestReport?.id
		const metrics = applyBudget(
			input.metrics.filter(
				(metric) => !latestReportId || metric.reportId === latestReportId,
			),
			budget.maxMetricRows,
		)
		const reports = applyBudget(input.reports, budget.maxReports).map(
			toBundleReport,
		)
		const reportIds = new Set(reports.map((report) => report.id))
		const canonicalIds = new Set(metrics.map((metric) => metric.canonicalId))
		const metricIds = new Set(metrics.map((metric) => metric.id))

		return {
			reports,
			metrics,
			trends: applyBudget(
				input.trends.filter((trend) => canonicalIds.has(trend.metricId)),
				budget.maxTrends,
			).map(toBundleTrend),
			timeline: applyBudget(
				input.timeline.filter(
					(event) =>
						(event.reportId && reportIds.has(event.reportId)) ||
						(event.metricId && metricIds.has(event.metricId)),
				),
				budget.maxTimeline,
			).map(toBundleTimelineEvent),
			summary: buildSummary(input.knowledge),
			metadata: {
				questionType: input.request.questionType,
				resolver: RESOLVER_ID,
				excluded: input.excluded,
			},
		}
	}

	if (input.request.questionType === 'FACT_LOOKUP') {
		const metrics = applyBudget(input.metrics, budget.maxMetricRows)
		const sourceReportIds = new Set(metrics.map((metric) => metric.reportId))
		const reports = input.reports
			.filter((report) => sourceReportIds.has(report.id))
			.map(toBundleReport)
		const canonicalIds = new Set(metrics.map((metric) => metric.canonicalId))
		const metricIds = new Set(metrics.map((metric) => metric.id))

		return {
			reports,
			metrics,
			trends: applyBudget(
				input.trends.filter((trend) => canonicalIds.has(trend.metricId)),
				budget.maxTrends,
			).map(toBundleTrend),
			timeline: applyBudget(
				input.timeline.filter(
					(event) =>
						(event.reportId && sourceReportIds.has(event.reportId)) ||
						(event.metricId && metricIds.has(event.metricId)),
				),
				budget.maxTimeline,
			).map(toBundleTimelineEvent),
			summary: buildSummary(input.knowledge),
			metadata: {
				questionType: input.request.questionType,
				resolver: RESOLVER_ID,
				excluded: input.excluded,
			},
		}
	}

	const reports = applyBudget(input.reports, budget.maxReports)
	const reportIds = new Set(reports.map((report) => report.id))

	const metrics = applyBudget(
		input.metrics.filter((metric) => reportIds.has(metric.reportId)),
		budget.maxMetricRows,
	)

	const canonicalIds = new Set(metrics.map((metric) => metric.canonicalId))
	const metricIds = new Set(metrics.map((metric) => metric.id))
	const trends = applyBudget(
		input.trends.filter((trend) => canonicalIds.has(trend.metricId)),
		budget.maxTrends,
	).map(toBundleTrend)

	const timeline = applyBudget(
		input.timeline.filter(
			(event) =>
				(event.reportId && reportIds.has(event.reportId)) ||
				(event.metricId && metricIds.has(event.metricId)),
		),
		budget.maxTimeline,
	).map(toBundleTimelineEvent)

	return {
		reports: reports.map(toBundleReport),
		metrics,
		trends,
		timeline,
		summary: buildSummary(input.knowledge),
		metadata: {
			questionType: input.request.questionType,
			resolver: RESOLVER_ID,
			excluded: input.excluded,
		},
	}
}

function resolveWithMetrics(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
	options?: {
		forceReportId?: string
		includePriorContext?: boolean
	},
) {
	const scope = resolveScope(request)

	if (options?.forceReportId) {
		scope.reportId = options.forceReportId
	}

	const scopedMetrics = gatherScopedMetrics(knowledge, request, scope)
	const temporalMode = metricModeForQuestionType(request.questionType)
	const metrics = buildTemporalMetrics({
		metrics: scopedMetrics,
		request,
		scope,
		mode: temporalMode,
	})

	const reports = gatherCandidateReports({
		knowledge,
		request,
		scope,
		metrics: scopedMetrics,
		includePriorContext: options?.includePriorContext,
	})

	const trends = gatherCandidateTrends({
		knowledge,
		request,
		scope,
		metrics: scopedMetrics,
	})

	const reportIds = new Set(reports.map((report) => report.id))
	const metricIds = new Set(scopedMetrics.map((metric) => metric.id))
	const timeline = gatherCandidateTimeline({
		knowledge,
		request,
		scope,
		reportIds,
		metricIds,
	})

	return { metrics, reports, trends, timeline, scope }
}

function resolveStatusOverview(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const assembled = resolveWithMetrics(knowledge, request, {
		includePriorContext: true,
	})

	return assembleBundle({
		knowledge,
		request,
		...assembled,
		excluded: ['categorySliceOnly', 'clinicalScorePrimarySort'],
	})
}

function resolveFactLookup(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const assembled = resolveWithMetrics(knowledge, request, {
		includePriorContext: false,
	})

	return assembleBundle({
		knowledge,
		request,
		...assembled,
		excluded: ['broadOverview', 'historicalNoise'],
	})
}

function resolveTrend(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const assembled = resolveWithMetrics(knowledge, request, {
		includePriorContext: true,
	})

	return assembleBundle({
		knowledge,
		request,
		...assembled,
		excluded: ['latestSnapshotOnly'],
	})
}

function resolveCompare(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const scope = inferSubjectScope(request)
	const reports = sortedReports(knowledge)
	const compareReportIds =
		scope.reportIds ??
		(scope.reportId
			? [scope.reportId]
			: reports.slice(0, 2).map((report) => report.id))

	const compareRequest: EvidenceRequest = {
		...request,
		subject: {
			...request.subject,
			reportIds: compareReportIds,
		},
	}

	const assembled = resolveWithMetrics(knowledge, compareRequest, {
		includePriorContext: true,
	})

	return assembleBundle({
		knowledge,
		request,
		...assembled,
		excluded: ['singleSnapshot'],
	})
}

function resolveLatestReport(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const report = knowledge.latestReport

	if (!report) {
		return {
			reports: [],
			metrics: [],
			trends: [],
			timeline: [],
			summary: {
				headline: knowledge.summary.headline,
				lines: [],
				healthScore: null,
				limitations: [
					...knowledge.limitations.map((item) => item.message),
					'No imported reports are available yet.',
				],
			},
			metadata: {
				questionType: request.questionType,
				resolver: RESOLVER_ID,
				excluded: ['noReportsAvailable'],
			},
		}
	}

	const priorReport = sortedReports(knowledge).find(
		(candidate) => candidate.id !== report.id && candidate.metricCount > 0,
	)

	const latestRequest: EvidenceRequest = {
		...request,
		subject: {
			...request.subject,
			reportId: report.id,
		},
	}

	const assembled = resolveWithMetrics(knowledge, latestRequest, {
		forceReportId: report.id,
		includePriorContext: true,
	})

	const reports = [
		report,
		...(priorReport ? [priorReport] : []),
		...assembled.reports.filter(
			(candidate) =>
				candidate.id !== report.id && candidate.id !== priorReport?.id,
		),
	]

	return assembleBundle({
		knowledge,
		request,
		metrics: assembled.metrics,
		reports,
		trends: assembled.trends,
		timeline: assembled.timeline,
		excluded: ['clinicalScorePrimarySort'],
	})
}

function resolveExplain(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const assembled = resolveWithMetrics(knowledge, request, {
		includePriorContext: true,
	})

	return assembleBundle({
		knowledge,
		request,
		...assembled,
		excluded: ['unrelatedMetrics'],
	})
}

export function resolveHealthEvidence(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	switch (request.questionType) {
		case 'FACT_LOOKUP':
			return resolveFactLookup(knowledge, request)
		case 'TREND':
			return resolveTrend(knowledge, request)
		case 'COMPARE':
			return resolveCompare(knowledge, request)
		case 'LATEST_REPORT':
			return resolveLatestReport(knowledge, request)
		case 'EXPLAIN':
			return resolveExplain(knowledge, request)
		case 'UNKNOWN':
			return resolveStatusOverview(knowledge, request)
		case 'STATUS_OVERVIEW':
		default:
			return resolveStatusOverview(knowledge, request)
	}
}

export type { QuestionType }
