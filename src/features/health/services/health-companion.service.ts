import { C } from '@/constants/colors'
import { healthAskPath, healthSettingsSection } from '@/constants/routes'
import {
	buildHealthSummary,
	buildLongitudinalHealthProfile,
	classifyReportType,
	timelineSummaryForReport,
} from '@/features/health-intelligence'
import type { ChronicleInsight } from '@/features/health-insights/types/health-insights.types'
import { detectReportChanges } from '@/features/health-insights/engines/change-detection.engine'
import {
	getCategoryMeta,
	mapCategoryId,
} from '@/features/health-knowledge/graph/metric-categories'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	countProcessingReports,
	isReportDisplayReady,
	isReportFullyClassified,
	reportNeedsReprocess,
} from '@/features/health/services/report-readiness.service'
import { deriveReportBadgeStatus } from '@/features/health/services/health-coverage.service'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type {
	HealthAttentionItem,
	HealthChangeItem,
	HealthCompanionView,
	HealthInsightGroup,
	HealthJourneyEvent,
	HealthNextStep,
	HealthReportSummary,
	HealthScoreReason,
	HealthStatusLabel,
	HealthTrendHighlight,
	MetricInsightGroup,
} from '@/features/health/types/health-companion.types'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import { computeHealthScoreFromHistories } from '@/features/health-knowledge/services/health-scoring.service'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

function formatDisplayDate(value: string): string {
	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function deriveStatus(input: {
	graph: HealthKnowledgeGraph
	insights: ChronicleInsight[]
	needsReview: number
	hasProcessingReports?: boolean
}): { status: HealthStatusLabel; detail: string; score: number | null } {
	const histories = input.graph.profile.metricHistories
	let totalWithStatus = 0
	let unknownCount = 0
	let abnormalCount = 0
	let improvingCount = 0
	let decliningCount = 0

	for (const history of histories) {
		const latest = history.observations[history.observations.length - 1]

		if (latest?.status) {
			totalWithStatus += 1

			if (latest.status === 'unknown') {
				unknownCount += 1
			}

			if (ABNORMAL.has(latest.status)) {
				abnormalCount += 1
			}
		}

		if (history.trend.direction === 'improving') {
			improvingCount += 1
		}

		if (
			history.trend.direction === 'declining' ||
			history.trend.direction === 'rapid_change'
		) {
			decliningCount += 1
		}
	}

	const classifiedCount = totalWithStatus - unknownCount
	const score = computeHealthScoreFromHistories(histories)
	const unknownRatio = totalWithStatus > 0 ? unknownCount / totalWithStatus : 0

	if (totalWithStatus === 0) {
		return {
			status: 'Awaiting Data',
			detail: input.hasProcessingReports
				? 'Chronicle is still organizing your latest reports.'
				: 'No laboratory results detected yet.',
			score: null,
		}
	}

	if (
		score === null ||
		unknownRatio > 0.5 ||
		(score === 0 && classifiedCount < totalWithStatus)
	) {
		return {
			status: 'Partial Results',
			detail: input.hasProcessingReports
				? 'Chronicle is still organizing your latest reports.'
				: unknownCount > 0
					? `${unknownCount} result${unknownCount === 1 ? '' : 's'} still being classified.`
					: 'Some reports still need your help before your picture is complete.',
			score: null,
		}
	}

	const warningInsights = input.insights.filter(
		(item) => item.severity === 'attention',
	)

	if (
		input.needsReview > 0 ||
		abnormalCount >= 3 ||
		warningInsights.length >= 2
	) {
		return {
			status: 'Needs Attention',
			detail: `${abnormalCount} marker${abnormalCount === 1 ? '' : 's'} need review`,
			score,
		}
	}

	if (improvingCount > decliningCount && improvingCount > 0) {
		return {
			status: 'Improving',
			detail: `${improvingCount} area${improvingCount === 1 ? '' : 's'} trending better`,
			score,
		}
	}

	if (abnormalCount > 0) {
		return {
			status: 'Monitoring Required',
			detail: `${abnormalCount} area${abnormalCount === 1 ? '' : 's'} to keep watching`,
			score,
		}
	}

	if (score === 0) {
		return {
			status: 'Partial Results',
			detail: 'Some results still need classification.',
			score: null,
		}
	}

	return {
		status: 'Looking Good',
		detail: `${score}% of markers in range`,
		score,
	}
}

function humanMetricStatus(
	displayName: string,
	status: string,
	trendDirection?: string,
): string {
	if (trendDirection === 'improving') {
		return `${displayName} is improving`
	}

	if (status === 'low' || status === 'borderline') {
		return `${displayName} remains slightly low`
	}

	if (status === 'high') {
		return `${displayName} is slightly elevated`
	}

	if (status === 'critical') {
		return `${displayName} is above the recommended range`
	}

	return `${displayName} is stable`
}

function buildScoreReasons(
	groups: MetricInsightGroup[],
	score: number | null,
): HealthScoreReason[] {
	if (groups.length === 0 || score === null) {
		return []
	}

	const reasons: HealthScoreReason[] = []

	for (const group of groups) {
		if (group.status === 'needs_attention') {
			const metric = group.metrics.find((item) => ABNORMAL.has(item.status))
			reasons.push({
				id: `warn-${group.id}`,
				label: metric
					? humanMetricStatus(metric.name, metric.status)
					: `${group.label} needs monitoring`,
				kind: 'warning',
			})
			continue
		}

		if (group.status === 'improving') {
			reasons.push({
				id: `pos-${group.id}`,
				label: `${group.label} trending better`,
				kind: 'positive',
			})
			continue
		}

		reasons.push({
			id: `ok-${group.id}`,
			label: `${group.label} stable`,
			kind: 'positive',
		})
	}

	const warnings = reasons.filter((item) => item.kind === 'warning')
	const positives = reasons.filter((item) => item.kind === 'positive')

	return [...warnings, ...positives].slice(0, 6)
}

function buildTrendHighlights(input: {
	groups: MetricInsightGroup[]
	changes: HealthChangeItem[]
	graph: HealthKnowledgeGraph
}): HealthTrendHighlight[] {
	const highlights: HealthTrendHighlight[] = []

	for (const change of input.changes) {
		if (change.direction === 'improved' || change.direction === 'resolved') {
			highlights.push({
				id: change.id,
				label: change.label,
				detail: change.detail ?? 'Compared with your previous report',
				status: 'improving',
			})
		} else if (change.direction === 'worsened') {
			highlights.push({
				id: change.id,
				label: change.label,
				detail: change.detail ?? 'Changed since your last report',
				status: 'needs_attention',
			})
		}
	}

	for (const group of input.groups) {
		for (const metric of group.metrics) {
			if (highlights.length >= 6) break

			if (group.status === 'needs_attention' && ABNORMAL.has(metric.status)) {
				if (highlights.some((item) => item.label.includes(metric.name))) {
					continue
				}

				highlights.push({
					id: `trend-${metric.id}`,
					label: metric.name,
					detail: humanMetricStatus(metric.name, metric.status),
					status: 'needs_attention',
					metricId: metric.id,
					categoryId: group.id,
				})
			} else if (group.status === 'improving') {
				highlights.push({
					id: `trend-${metric.id}`,
					label: metric.name,
					detail: 'Improving across recent reports',
					status: 'improving',
					metricId: metric.id,
					categoryId: group.id,
				})
			}
		}
	}

	for (const history of input.graph.profile.metricHistories) {
		if (highlights.length >= 6) break

		if (
			history.trend.direction === 'stable' &&
			history.observations.length >= 2 &&
			!highlights.some((item) => item.metricId === history.canonicalMetricId)
		) {
			highlights.push({
				id: `stable-${history.canonicalMetricId}`,
				label: history.displayName,
				detail: `Holding steady at ${history.baseline.latestValueLabel}`,
				status: 'stable',
				metricId: history.canonicalMetricId,
				categoryId: history.categoryId,
			})
		}
	}

	const priority = {
		needs_attention: 0,
		new_finding: 1,
		improving: 2,
		stable: 3,
	}

	return highlights
		.sort((a, b) => priority[a.status] - priority[b.status])
		.slice(0, 4)
}

function buildInsightGroups(input: {
	groups: MetricInsightGroup[]
	insights: ChronicleInsight[]
}): HealthInsightGroup[] {
	const result: HealthInsightGroup[] = []
	const coveredCategoryIds = new Set<string>()

	for (const group of input.groups) {
		const primaryMetric = group.metrics[0]
		const relatedInsight = input.insights.find(
			(item) => item.categoryId === group.id,
		)

		coveredCategoryIds.add(group.id)

		const trend =
			group.status === 'improving'
				? 'Improving'
				: group.status === 'needs_attention'
					? 'Needs attention'
					: 'Stable'

		const defaultSummary =
			group.id === 'urine'
				? 'Routine urine microscopy findings recorded.'
				: group.status === 'needs_attention'
					? `${group.label} markers need monitoring based on your latest results.`
					: `${group.label} markers look steady across recent reports.`

		result.push({
			id: group.id,
			label: group.label,
			color: group.color,
			summary: relatedInsight?.summary ?? defaultSummary,
			trend,
			evidence:
				relatedInsight?.why ??
				(primaryMetric
					? `Latest: ${primaryMetric.name} ${primaryMetric.value}`
					: 'Based on your imported lab reports'),
			nextStep:
				group.status === 'needs_attention'
					? 'Discuss these results with your doctor at your next visit.'
					: 'Continue regular checkups to track changes over time.',
			categoryId: group.id,
			metricId: primaryMetric?.id,
			reportId: relatedInsight?.evidence[0]?.reportId,
		})
	}

	for (const insight of input.insights) {
		if (result.length >= 12) {
			break
		}

		if (insight.categoryId && coveredCategoryIds.has(insight.categoryId)) {
			continue
		}

		if (result.some((item) => item.id === `insight-${insight.id}`)) {
			continue
		}

		const category = insight.categoryId
			? getCategoryMeta(mapCategoryId(insight.categoryId))
			: null

		result.push({
			id: `insight-${insight.id}`,
			label: insight.title,
			color: category?.color ?? C.teal,
			summary: insight.summary,
			trend:
				insight.severity === 'attention'
					? 'Needs attention'
					: insight.severity === 'positive'
						? 'Improving'
						: 'Stable',
			evidence: insight.why,
			nextStep:
				insight.severity === 'attention'
					? 'Review the source report or ask Chronicle for context.'
					: 'Keep tracking this over your next checkup.',
			categoryId: insight.categoryId,
			metricId: insight.metricId,
			reportId: insight.evidence[0]?.reportId,
		})
	}

	return result.slice(0, 12)
}

function buildAttention(input: {
	graph: HealthKnowledgeGraph
	insights: ChronicleInsight[]
	needsReview: number
}): HealthAttentionItem[] {
	const items: HealthAttentionItem[] = []

	if (input.needsReview > 0) {
		items.push({
			id: 'review-pending',
			title: `${input.needsReview} report${input.needsReview === 1 ? '' : 's'} need review`,
			detail:
				'Confirm imported reports so Chronicle can include them in your health picture.',
			severity: 'medium',
		})
	}

	for (const history of input.graph.profile.metricHistories) {
		const latest = history.observations[history.observations.length - 1]

		if (!latest || !ABNORMAL.has(latest.status)) {
			continue
		}

		items.push({
			id: `attention-${history.canonicalMetricId}`,
			title: humanMetricStatus(
				history.displayName,
				latest.status,
				history.trend.direction === 'improving' ? 'improving' : undefined,
			),
			detail: `Latest result: ${latest.value}. Detected in ${latest.reportTitle}.`,
			severity: latest.status === 'critical' ? 'high' : 'medium',
			categoryId: history.categoryId,
			metricId: history.canonicalMetricId,
			reportId: latest.reportId,
		})
	}

	for (const insight of input.insights) {
		if (
			insight.severity !== 'attention' ||
			insight.category !== 'areas_to_watch'
		) {
			continue
		}

		if (items.some((item) => item.title === insight.title)) {
			continue
		}

		items.push({
			id: `insight-${insight.id}`,
			title: insight.title,
			detail: insight.summary,
			severity: 'medium',
			categoryId: insight.categoryId,
			metricId: insight.metricId,
			reportId: insight.evidence[0]?.reportId,
		})
	}

	return items.slice(0, 4)
}

function buildChanges(input: {
	graph: HealthKnowledgeGraph
	uploadedReports: UploadedHealthReport[]
}): HealthChangeItem[] {
	const detected = detectReportChanges({
		histories: input.graph.profile.metricHistories,
		uploadedReports: input.uploadedReports,
	})

	const items: HealthChangeItem[] = detected.map((change) => ({
		id: change.id,
		label: change.description,
		direction:
			change.kind === 'improved' || change.kind === 'resolved'
				? change.kind === 'resolved'
					? 'resolved'
					: 'improved'
				: change.kind === 'worsening'
					? 'worsened'
					: 'stable',
		detail: `${change.previousValue ?? '—'} → ${change.currentValue}`,
	}))

	return items.slice(0, 4)
}

function buildNextSteps(input: {
	attention: HealthAttentionItem[]
	needsReview: number
}): HealthNextStep[] {
	const steps: HealthNextStep[] = []

	if (input.needsReview > 0) {
		steps.push({
			id: 'review-imports',
			title: 'Review imported reports',
			reason: 'Unreviewed reports may be missing from your health summary.',
			actionLabel: 'Review now',
			actionPath: healthSettingsSection('review'),
		})
	}

	for (const item of input.attention.slice(0, 3)) {
		if (item.id === 'review-pending') {
			continue
		}

		steps.push({
			id: `step-${item.id}`,
			title:
				item.categoryId === 'liver'
					? 'Discuss liver findings with your doctor'
					: `Follow up on ${item.title.toLowerCase()}`,
			reason: item.detail,
			actionLabel: item.reportId ? 'View report' : 'Ask Chronicle',
			actionPath: item.reportId
				? `/health/reports/${item.reportId}`
				: healthAskPath({ q: item.title }),
		})
	}

	return steps.slice(0, 4)
}

export function buildReportSummaries(
	reports: UploadedHealthReport[],
	options: { includePartial?: boolean } = {},
): HealthReportSummary[] {
	return [...reports]
		.filter((report) => {
			if (!isReportDisplayReady(report)) {
				return false
			}

			if (options.includePartial) {
				return true
			}

			return isReportFullyClassified(report)
		})
		.sort(
			(a, b) =>
				Date.parse(getReportDisplayDate(b)) -
				Date.parse(getReportDisplayDate(a)),
		)
		.map((report) => {
			const parsed = getParsedHealthReport(report)
			const metricCount = parsed?.metrics.length ?? 0
			const abnormal = (parsed?.metrics ?? [])
				.filter((metric) => ABNORMAL.has(metric.status))
				.slice(0, 3)
				.map(
					(metric) =>
						`${metric.displayName} ${metric.status === 'low' ? 'low' : 'elevated'}`,
				)

			let summary: string
			const metrics = parsed?.metrics ?? []
			const unknownCount = metrics.filter(
				(metric) => metric.status === 'unknown',
			).length
			const classifiedCount = metrics.length - unknownCount

			if (metricCount === 0) {
				summary = 'No laboratory metrics detected in this report.'
			} else if (abnormal.length > 0) {
				summary = `${abnormal.length} finding${abnormal.length === 1 ? '' : 's'} noted · ${metricCount} results reviewed`
			} else if (unknownCount > 0) {
				summary = `${classifiedCount} classified · ${unknownCount} still being reviewed`
			} else {
				summary = `All reviewed markers within expected range · ${metricCount} results`
			}

			return {
				id: report.id,
				title: getReportDisplayTitle(report),
				hospital:
					parsed?.metadata.laboratory &&
					parsed.metadata.laboratory !== 'Medical center'
						? parsed.metadata.laboratory
						: 'Medical center',
				doctor: parsed?.metadata.doctorName ?? undefined,
				date: getReportDisplayDate(report, parsed),
				displayDate: formatDisplayDate(getReportDisplayDate(report, parsed)),
				summary,
				findings: abnormal,
				status: report.status,
				isReady: isReportDisplayReady(report),
				classifiedCount,
				unknownCount,
				badgeStatus: deriveReportBadgeStatus({
					classifiedCount,
					unknownCount,
					hasAbnormal: abnormal.length > 0,
					needsReprocess: reportNeedsReprocess(report),
				}),
			}
		})
}

function buildJourneyEvents(input: {
	reports: UploadedHealthReport[]
	graph: HealthKnowledgeGraph
	changes: HealthChangeItem[]
}): HealthJourneyEvent[] {
	const events: HealthJourneyEvent[] = []

	for (const report of input.reports.filter(
		(item) => item.status === 'completed',
	)) {
		const classified = classifyReportType(report)
		const isReady = isReportDisplayReady(report)

		events.push({
			id: `checkup-${report.id}`,
			date: classified.date,
			displayDate: formatDisplayDate(classified.date),
			title: getReportDisplayTitle(report),
			summary: isReady
				? timelineSummaryForReport(classified)
				: 'Incomplete extraction — reprocess recommended',
			kind:
				classified.kind === 'ecg' || classified.kind === 'radiology'
					? 'monitoring'
					: isReady
						? 'checkup'
						: 'review',
			reportId: report.id,
			isIncomplete: !isReady,
		})
	}

	for (const history of input.graph.profile.metricHistories) {
		const latest = history.observations[history.observations.length - 1]

		if (latest && ABNORMAL.has(latest.status)) {
			const category = getCategoryMeta(history.categoryId)

			events.push({
				id: `finding-${history.canonicalMetricId}`,
				date: latest.observedAt,
				displayDate: formatDisplayDate(latest.observedAt),
				title: `${category.name} — ${history.displayName} ${latest.status}`,
				summary: `Detected in ${latest.reportTitle}`,
				kind: 'finding',
				reportId: latest.reportId,
				categoryId: history.categoryId,
			})
		}

		if (history.trend.direction === 'improving') {
			events.push({
				id: `improvement-${history.canonicalMetricId}`,
				date: latest?.observedAt ?? '',
				displayDate: latest ? formatDisplayDate(latest.observedAt) : '—',
				title: `${history.displayName} improved`,
				summary: `Trending better across recent reports`,
				kind: 'improvement',
				categoryId: history.categoryId,
				reportId: latest?.reportId,
			})
		}
	}

	return events
		.filter((event) => event.date)
		.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
		.slice(0, 20)
}

function buildMetricGroups(graph: HealthKnowledgeGraph): MetricInsightGroup[] {
	const groups = new Map<string, MetricInsightGroup>()

	for (const history of graph.profile.metricHistories) {
		const meta = getCategoryMeta(history.categoryId)
		const latest = history.observations[history.observations.length - 1]
		const status =
			history.trend.direction === 'improving'
				? 'improving'
				: latest && ABNORMAL.has(latest.status)
					? 'needs_attention'
					: 'stable'

		const existing = groups.get(history.categoryId) ?? {
			id: history.categoryId,
			label: meta.name,
			status: 'stable' as const,
			color: meta.color,
			metrics: [],
		}

		if (status === 'needs_attention') {
			existing.status = 'needs_attention'
		} else if (
			status === 'improving' &&
			existing.status !== 'needs_attention'
		) {
			existing.status = 'improving'
		}

		existing.metrics.push({
			id: history.canonicalMetricId,
			name: history.displayName,
			value: history.baseline.latestValueLabel,
			trendLabel:
				history.trend.direction === 'improving'
					? 'Improving'
					: history.trend.direction === 'declining'
						? 'Needs attention'
						: 'Stable',
			status: latest?.status ?? 'unknown',
		})

		groups.set(history.categoryId, existing)
	}

	return [...groups.values()]
}

function buildNarrative(
	insights: ChronicleInsight[],
	summary?: { headline: string; bullets: string[] } | null,
): string[] {
	if (summary?.headline) {
		const paragraphs = [summary.headline, ...summary.bullets.slice(0, 4)]
		return paragraphs.filter(Boolean)
	}

	const ordered = [
		...insights.filter((item) => item.category === 'areas_to_watch'),
		...insights.filter((item) => item.category === 'recently_changed'),
		...insights.filter((item) => item.category === 'positive_progress'),
		...insights.filter((item) => item.category === 'long_term_trends'),
	]

	const paragraphs = ordered.map((item) => {
		if (item.summary.endsWith('.')) {
			return item.summary
		}

		return `${item.summary}.`
	})

	if (paragraphs.length === 0) {
		return []
	}

	return paragraphs.slice(0, 6)
}

export function buildHealthCompanionView(input: {
	graph: HealthKnowledgeGraph
	uploadedReports: UploadedHealthReport[]
	insights: ChronicleInsight[]
	needsReview?: number
	trendSeries?: import('@/features/health/types').TrendSeries[]
	personId?: string
	coverage?: HealthCoverageSnapshot | null
}): HealthCompanionView {
	const needsReview = input.needsReview ?? 0
	const personId = input.personId ?? input.graph.profile.personId
	const hasProcessingReports = countProcessingReports(input.uploadedReports) > 0
	const profile = buildLongitudinalHealthProfile({
		personId,
		graph: input.graph,
	})
	const { status, detail, score } = deriveStatus({
		graph: input.graph,
		insights: input.insights,
		needsReview,
		hasProcessingReports,
	})
	const resolvedStatus =
		input.coverage?.corpusCompleteness === 'partial' &&
		status === 'Looking Good'
			? ('Partial Results' as const)
			: status
	const healthSummary = buildHealthSummary({
		graph: input.graph,
		profile,
		insights: input.insights,
		statusLabel: resolvedStatus,
	})
	const attention = buildAttention({
		graph: input.graph,
		insights: input.insights,
		needsReview,
	})
	const changes = buildChanges({
		graph: input.graph,
		uploadedReports: input.uploadedReports,
	})
	const metricGroups = buildMetricGroups(input.graph)
	const recentReports = buildReportSummaries(input.uploadedReports, {
		includePartial: true,
	})
	const journeyEvents = buildJourneyEvents({
		reports: input.uploadedReports,
		graph: input.graph,
		changes,
	})

	return {
		status: resolvedStatus,
		statusDetail: detail,
		score,
		scoreReasons: buildScoreReasons(metricGroups, score),
		attention,
		changes,
		nextSteps: buildNextSteps({ attention, needsReview }),
		recentReports,
		journeyEvents,
		metricGroups,
		trendSeries: input.trendSeries ?? [],
		trendHighlights: buildTrendHighlights({
			groups: metricGroups,
			changes,
			graph: input.graph,
		}),
		insightGroups: buildInsightGroups({
			groups: metricGroups,
			insights: input.insights,
		}),
		narrative: buildNarrative(input.insights, healthSummary),
		profile,
		healthSummary,
		coverage: input.coverage ?? null,
	}
}

export function getStatusColor(status: HealthStatusLabel): string {
	switch (status) {
		case 'Looking Good':
			return C.greenAlt
		case 'Improving':
			return C.teal
		case 'Monitoring Required':
			return C.orange
		case 'Awaiting Data':
			return C.accentBlue
		case 'Partial Results':
			return C.orange
		default:
			return C.red
	}
}

export function scoreReportSearchRelevance(
	report: UploadedHealthReport,
	query: string,
): number {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return 0
	}

	let score = 0
	const parsed = getParsedHealthReport(report)
	const title = getReportDisplayTitle(report).toLowerCase()
	const lab = (parsed?.metadata.laboratory ?? '').toLowerCase()
	const doctor = (parsed?.metadata.doctorName ?? '').toLowerCase()

	if (title.includes(normalized)) {
		score += 3
	}

	if (lab.includes(normalized)) {
		score += 2
	}

	if (doctor.includes(normalized)) {
		score += 2
	}

	for (const metric of parsed?.metrics ?? []) {
		const metricCategory = mapCategoryId(
			(metric as { category?: string }).category ?? 'general',
		)

		if (
			metric.displayName.toLowerCase().includes(normalized) ||
			metricCategory.includes(normalized)
		) {
			score += 4
		}
	}

	const categoryKeywords: Record<string, string[]> = {
		liver: ['liver', 'alt', 'ast', 'alp', 'sgpt', 'sgot', 'fatty'],
		heart: ['heart', 'cholesterol', 'ldl', 'hdl', 'lipid'],
		kidney: ['kidney', 'creatinine', 'urea'],
		diabetes: ['diabetes', 'glucose', 'sugar', 'hba1c', 'a1c'],
		vitamin: ['vitamin', 'd3', 'b12', 'ferritin'],
	}

	for (const [category, keywords] of Object.entries(categoryKeywords)) {
		if (keywords.some((keyword) => normalized.includes(keyword))) {
			const hasMatch = (parsed?.metrics ?? []).some((metric) => {
				const metricCategory = mapCategoryId(
					(metric as { category?: string }).category ?? 'general',
				)

				return (
					metricCategory === category ||
					keywords.some((keyword) =>
						metric.displayName.toLowerCase().includes(keyword),
					)
				)
			})

			if (hasMatch) {
				score += 6
			}
		}
	}

	return score
}
