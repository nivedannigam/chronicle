import type {
	HealthKnowledge,
	HealthKnowledgeMetric,
	HealthKnowledgeReportRef,
	HealthKnowledgeTimelineEvent,
	HealthKnowledgeTrendPoint,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import { detectCategoryFromReportTitle } from '@/shared/ai/intent/category-intent.patterns'
import {
	clinicalImportanceScore,
	compareRankedItems,
	rankingAxisPriority,
	recencyScore,
	subjectRelevanceScore,
	trendSignificanceScore,
	type RankableEvidenceItem,
} from '@/shared/ai/evidence-planning/evidence-ranker'
import type {
	EvidenceBundleMetric,
	EvidenceBundleReport,
	EvidenceBundleTimelineEvent,
	EvidenceBundleTrend,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'
import {
	allReportRefs,
	matchMetrics,
} from '@/shared/ai/tools/health/health-tool.helpers'
import {
	inferSubjectScope,
	scopeMatchesCanonicalId,
	type SubjectScope,
} from '@/features/health/evidence/health-evidence.scope'

const DIAGNOSTIC_CATEGORY_PATTERNS: Array<{
	pattern: RegExp
	categoryId: string
}> = [
	{
		pattern:
			/\btmt\b|\btreadmill\b|\bstress test\b|\becg\b|\belectrocardiogram\b|\becho\b|\bcardiac\b/i,
		categoryId: 'heart',
	},
	{
		pattern: /\bultrasound\b|\bsonography\b|\bfibroscan\b/i,
		categoryId: 'liver',
	},
]

function diagnosticReportMatchesScope(
	report: HealthKnowledgeReportRef,
	categoryHints: string[],
): boolean {
	if (!isDiagnosticReport(report)) {
		return false
	}

	if (categoryHints.length === 0) {
		return false
	}

	return (
		reportMatchesCategoryHint(report, categoryHints) ||
		DIAGNOSTIC_CATEGORY_PATTERNS.some(
			({ pattern, categoryId }) =>
				categoryHints.includes(categoryId) && pattern.test(report.title),
		)
	)
}

export function sortedReports(
	knowledge: HealthKnowledge,
): HealthKnowledgeReportRef[] {
	return allReportRefs(knowledge).sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	)
}

const DIAGNOSTIC_TITLE_PATTERN =
	/\becg\b|\belectrocardiogram\b|\becho\b|\bcardiac\b|\btmt\b|\btreadmill\b|\bstress test\b|\bultrasound\b|\bsonography\b|\bx-?ray\b|\bmri\b|\bct scan\b/i

export function isDiagnosticReport(report: HealthKnowledgeReportRef): boolean {
	if (report.metricCount === 0) {
		return true
	}

	return (
		DIAGNOSTIC_TITLE_PATTERN.test(report.title) ||
		report.reportType === 'diagnostic' ||
		Boolean(detectCategoryFromReportTitle(report.title))
	)
}

function reportMatchesCategoryHint(
	report: HealthKnowledgeReportRef,
	categoryHints: string[],
): boolean {
	if (categoryHints.length === 0) {
		return false
	}

	const titleCategory = detectCategoryFromReportTitle(report.title)

	return (
		Boolean(titleCategory && categoryHints.includes(titleCategory)) ||
		categoryHints.some((hint) => report.title.toLowerCase().includes(hint))
	)
}

function metricMatchesScope(
	metric: HealthKnowledgeMetric,
	scope: SubjectScope,
): boolean {
	if (scope.reportIds?.length && !scope.reportIds.includes(metric.reportId)) {
		return false
	}

	if (scope.reportId && metric.reportId !== scope.reportId) {
		return false
	}

	if (scope.metricIds.length > 0 || scope.metricNames.length > 0) {
		return scopeMatchesCanonicalId(
			scope,
			metric.canonicalId,
			metric.displayName,
		)
	}

	if (scope.isWholeHealth) {
		return true
	}

	if (scope.categoryHints.length > 0) {
		return (
			scope.categoryHints.includes(metric.categoryId) ||
			reportMatchesCategoryHint(
				{
					id: metric.reportId,
					title: metric.reportTitle,
				} as HealthKnowledgeReportRef,
				scope.categoryHints,
			)
		)
	}

	return true
}

function metricRankable(
	metric: HealthKnowledgeMetric,
	request: EvidenceRequest,
	scope: SubjectScope,
	trendScore = 0,
): RankableEvidenceItem {
	return {
		id: metric.id,
		relevance: subjectRelevanceScore({
			haystack: `${metric.displayName} ${metric.canonicalId} ${metric.reportTitle} ${request.question}`,
			categoryId: scope.categoryHints[0],
			metricIds: scope.metricIds,
			metricNames: scope.metricNames,
			canonicalId: metric.canonicalId,
			categoryMatch: scope.categoryHints.includes(metric.categoryId),
		}),
		recency: recencyScore(metric.observedAt),
		importance: clinicalImportanceScore({
			status: metric.status,
			clinicalScore: metric.clinicalScore,
		}),
		trend: trendScore,
	}
}

function reportRankable(
	report: HealthKnowledgeReportRef,
	request: EvidenceRequest,
	scope: SubjectScope,
	metrics: HealthKnowledgeMetric[],
): RankableEvidenceItem {
	const reportMetrics = metrics.filter(
		(metric) => metric.reportId === report.id,
	)
	const avgRecency =
		reportMetrics.length > 0
			? reportMetrics.reduce(
					(sum, metric) => sum + recencyScore(metric.observedAt),
					0,
				) / reportMetrics.length
			: recencyScore(report.date)

	const categoryMatch = reportMatchesCategoryHint(report, scope.categoryHints)
	const diagnosticBoost =
		isDiagnosticReport(report) && scope.categoryHints.length > 0 ? 0.25 : 0

	return {
		id: report.id,
		relevance:
			subjectRelevanceScore({
				haystack: `${report.title} ${report.reportType ?? ''} ${request.question}`,
				categoryId: scope.categoryHints[0],
				metricIds: scope.metricIds,
				metricNames: scope.metricNames,
			}) +
			(categoryMatch ? 0.3 : 0) +
			diagnosticBoost,
		recency: Math.max(recencyScore(report.date), avgRecency),
		importance: reportMetrics.some((metric) =>
			['critical', 'high', 'low', 'borderline'].includes(
				metric.status.toLowerCase(),
			),
		)
			? 0.75
			: 0.35,
		trend: 0,
	}
}

export function gatherScopedMetrics(
	knowledge: HealthKnowledge,
	request: EvidenceRequest,
	scope: SubjectScope,
): HealthKnowledgeMetric[] {
	const named = matchMetrics(knowledge, scope.metricIds, scope.metricNames)

	let metrics = knowledge.metrics.filter((metric) =>
		metricMatchesScope(metric, scope),
	)

	if (named.length > 0) {
		const namedIds = new Set(named.map((metric) => metric.id))
		const intersected = metrics.filter((metric) => namedIds.has(metric.id))

		if (intersected.length > 0) {
			metrics = intersected
		} else {
			metrics = named.filter((metric) => metricMatchesScope(metric, scope))
		}
	}

	const priority = rankingAxisPriority(request.questionType)

	return [...metrics].sort((left, right) =>
		compareRankedItems(
			metricRankable(left, request, scope),
			metricRankable(right, request, scope),
			priority,
		),
	)
}

export function metricsByCanonicalHistory(metrics: HealthKnowledgeMetric[]) {
	const grouped = new Map<string, HealthKnowledgeMetric[]>()

	for (const metric of [...metrics].sort(
		(a, b) =>
			new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
	)) {
		const list = grouped.get(metric.canonicalId) ?? []
		list.push(metric)
		grouped.set(metric.canonicalId, list)
	}

	return grouped
}

export function buildTemporalMetrics(input: {
	metrics: HealthKnowledgeMetric[]
	request: EvidenceRequest
	scope: SubjectScope
	mode: 'snapshot' | 'compare' | 'history' | 'fact'
}): EvidenceBundleMetric[] {
	const grouped = metricsByCanonicalHistory(input.metrics)
	const priority = rankingAxisPriority(input.request.questionType)
	const canonicalOrder = [...grouped.entries()]
		.map(([canonicalId, history]) => ({
			canonicalId,
			history,
			rankable: metricRankable(history[0]!, input.request, input.scope),
		}))
		.sort((left, right) =>
			compareRankedItems(left.rankable, right.rankable, priority),
		)

	const rows: EvidenceBundleMetric[] = []

	for (const { history } of canonicalOrder) {
		if (input.mode === 'fact') {
			const latest = history[0]

			if (latest) {
				rows.push(toBundleMetric(latest, 'latest'))
			}

			continue
		}

		if (input.mode === 'history') {
			for (const metric of history) {
				rows.push(toBundleMetric(metric, 'history'))
			}

			continue
		}

		const latest = history[0]

		if (latest) {
			rows.push(toBundleMetric(latest, 'latest'))
		}

		const previous = history[1]

		if (previous && input.mode !== 'snapshot') {
			rows.push(toBundleMetric(previous, 'previous'))
		}

		if (input.mode === 'compare') {
			for (const metric of history.slice(2)) {
				rows.push(toBundleMetric(metric, 'history'))
			}
		}
	}

	return rows
}

function toBundleMetric(
	metric: HealthKnowledgeMetric,
	temporalRole: EvidenceBundleMetric['temporalRole'],
): EvidenceBundleMetric {
	return {
		id: metric.id,
		canonicalId: metric.canonicalId,
		displayName: metric.displayName,
		value: metric.value,
		unit: metric.unit,
		status: metric.status,
		referenceRange: metric.referenceRange,
		observedAt: metric.observedAt,
		reportId: metric.reportId,
		reportTitle: metric.reportTitle,
		categoryId: metric.categoryId,
		temporalRole,
	}
}

export function gatherCandidateReports(input: {
	knowledge: HealthKnowledge
	request: EvidenceRequest
	scope: SubjectScope
	metrics: HealthKnowledgeMetric[]
	includePriorContext?: boolean
}): HealthKnowledgeReportRef[] {
	const reports = sortedReports(input.knowledge)
	const linkedReportIds = new Set(
		input.metrics.map((metric) => metric.reportId),
	)
	const candidates = new Map<string, HealthKnowledgeReportRef>()

	if (input.scope.reportIds?.length) {
		for (const report of reports) {
			if (input.scope.reportIds.includes(report.id)) {
				candidates.set(report.id, report)
			}
		}
	} else if (input.scope.reportId) {
		const report = reports.find((item) => item.id === input.scope.reportId)

		if (report) {
			candidates.set(report.id, report)
		}
	}

	for (const report of reports) {
		if (linkedReportIds.has(report.id)) {
			candidates.set(report.id, report)
		}
	}

	for (const report of reports) {
		if (diagnosticReportMatchesScope(report, input.scope.categoryHints)) {
			candidates.set(report.id, report)
		}
	}

	if (input.scope.isWholeHealth && input.knowledge.latestReport) {
		candidates.set(
			input.knowledge.latestReport.id,
			input.knowledge.latestReport,
		)
	}

	if (input.includePriorContext !== false && input.knowledge.latestReport) {
		candidates.set(
			input.knowledge.latestReport.id,
			input.knowledge.latestReport,
		)

		const prior = reports.find(
			(report) =>
				report.id !== input.knowledge.latestReport?.id &&
				report.metricCount > 0,
		)

		if (prior) {
			candidates.set(prior.id, prior)
		}
	}

	if (input.scope.categoryHints.length > 0) {
		for (const report of reports) {
			if (reportMatchesCategoryHint(report, input.scope.categoryHints)) {
				candidates.set(report.id, report)
			}
		}
	}

	const priority = rankingAxisPriority(input.request.questionType)

	return [...candidates.values()].sort((left, right) =>
		compareRankedItems(
			reportRankable(left, input.request, input.scope, input.metrics),
			reportRankable(right, input.request, input.scope, input.metrics),
			priority,
		),
	)
}

export function gatherCandidateTrends(input: {
	knowledge: HealthKnowledge
	request: EvidenceRequest
	scope: SubjectScope
	metrics: HealthKnowledgeMetric[]
}): HealthKnowledgeTrendPoint[] {
	const scopedCanonicalIds = new Set(
		input.metrics.map((metric) => metric.canonicalId),
	)
	const priority = rankingAxisPriority(input.request.questionType)

	return input.knowledge.trendAnalysis
		.filter((trend) => {
			if (input.scope.isWholeHealth) {
				return true
			}

			return scopedCanonicalIds.has(trend.metricId)
		})
		.map((trend) => ({
			trend,
			rankable: {
				id: trend.metricId,
				relevance: subjectRelevanceScore({
					haystack: `${trend.displayName} ${input.request.question}`,
					categoryId: input.scope.categoryHints[0],
					metricIds: input.scope.metricIds,
					metricNames: input.scope.metricNames,
					canonicalId: trend.metricId,
				}),
				recency: recencyScore(
					input.metrics.find((metric) => metric.canonicalId === trend.metricId)
						?.observedAt,
				),
				importance: trend.isActionable ? 0.8 : 0.4,
				trend: trendSignificanceScore(trend),
			},
		}))
		.sort((left, right) =>
			compareRankedItems(left.rankable, right.rankable, priority),
		)
		.map(({ trend }) => trend)
}

export function gatherCandidateTimeline(input: {
	knowledge: HealthKnowledge
	request: EvidenceRequest
	scope: SubjectScope
	reportIds: Set<string>
	metricIds: Set<string>
}): HealthKnowledgeTimelineEvent[] {
	const priority = rankingAxisPriority(input.request.questionType)

	return input.knowledge.timeline
		.filter((event) => {
			if (input.scope.isWholeHealth) {
				return true
			}

			if (event.reportId && input.reportIds.has(event.reportId)) {
				return true
			}

			if (event.metricId && input.metricIds.has(event.metricId)) {
				return true
			}

			return (
				subjectRelevanceScore({
					haystack: `${event.title} ${event.description} ${input.request.question}`,
					categoryId: input.scope.categoryHints[0],
					metricIds: input.scope.metricIds,
					metricNames: input.scope.metricNames,
				}) >= 0.5
			)
		})
		.map((event) => ({
			event,
			rankable: {
				id: event.id,
				relevance: subjectRelevanceScore({
					haystack: `${event.title} ${event.description} ${input.request.question}`,
					categoryId: input.scope.categoryHints[0],
					metricIds: input.scope.metricIds,
					metricNames: input.scope.metricNames,
				}),
				recency: recencyScore(event.date),
				importance:
					event.type === 'metric_critical'
						? 1
						: event.type === 'metric_abnormal'
							? 0.8
							: 0.4,
				trend: 0,
			},
		}))
		.sort((left, right) =>
			compareRankedItems(left.rankable, right.rankable, priority),
		)
		.map(({ event }) => event)
}

export function toBundleReport(
	report: HealthKnowledgeReportRef,
): EvidenceBundleReport {
	return {
		id: report.id,
		title: report.title,
		date: report.date,
		lab: report.lab,
		metricCount: report.metricCount,
		reportType: report.reportType,
		badgeStatus: report.badgeStatus,
		metricless: report.metricCount === 0,
	}
}

export function toBundleTrend(
	trend: HealthKnowledgeTrendPoint,
): EvidenceBundleTrend {
	return {
		metricId: trend.metricId,
		displayName: trend.displayName,
		direction: trend.direction,
		changePercent: trend.changePercent,
		dataPointCount: trend.dataPointCount,
		isActionable: trend.isActionable,
	}
}

export function toBundleTimelineEvent(
	event: HealthKnowledgeTimelineEvent,
): EvidenceBundleTimelineEvent {
	return {
		id: event.id,
		type: event.type,
		title: event.title,
		description: event.description,
		date: event.date,
		reportId: event.reportId,
		metricId: event.metricId,
	}
}

export function resolveScope(request: EvidenceRequest): SubjectScope {
	return inferSubjectScope(request)
}

export type MetricTemporalMode = 'snapshot' | 'compare' | 'history' | 'fact'

export function metricModeForQuestionType(
	questionType: QuestionType,
): MetricTemporalMode {
	switch (questionType) {
		case 'FACT_LOOKUP':
			return 'fact'
		case 'TREND':
			return 'history'
		case 'COMPARE':
			return 'compare'
		case 'EXPLAIN':
			return 'compare'
		case 'LATEST_REPORT':
			return 'snapshot'
		case 'STATUS_OVERVIEW':
		case 'UNKNOWN':
		default:
			return 'compare'
	}
}
