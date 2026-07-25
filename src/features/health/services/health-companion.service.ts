import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { detectReportChanges } from '@/features/health-insights/engines/change-detection.engine'
import type { ChronicleInsight } from '@/features/health-insights/types/health-insights.types'
import {
	getCategoryMeta,
	mapCategoryId,
} from '@/features/health-knowledge/graph/metric-categories'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { UploadedHealthReport } from '@/features/health/types'
import type {
	HealthAttentionItem,
	HealthChangeItem,
	HealthCompanionView,
	HealthJourneyEvent,
	HealthNextStep,
	HealthReportSummary,
	HealthStatusLabel,
	MetricInsightGroup,
} from '@/features/health/types/health-companion.types'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'

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
}): { status: HealthStatusLabel; detail: string; score: number | null } {
	const histories = input.graph.profile.metricHistories
	let normalCount = 0
	let totalWithStatus = 0
	let abnormalCount = 0
	let improvingCount = 0
	let decliningCount = 0

	for (const history of histories) {
		const latest = history.observations[history.observations.length - 1]

		if (latest?.status) {
			totalWithStatus += 1

			if (latest.status === 'normal') {
				normalCount += 1
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

	const score =
		totalWithStatus > 0
			? Math.round((normalCount / totalWithStatus) * 100)
			: null

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

	return {
		status: 'Looking Good',
		detail:
			score !== null ? `${score}% of markers in range` : 'Records look stable',
		score,
	}
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
			title: `${history.displayName} ${latest.status === 'low' ? 'low' : 'elevated'}`,
			detail: `Latest: ${latest.value} from ${latest.reportTitle}`,
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

	return items.slice(0, 5)
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

	for (const history of input.graph.profile.metricHistories) {
		if (
			history.trend.direction === 'stable' &&
			history.observations.length >= 2
		) {
			items.push({
				id: `stable-${history.canonicalMetricId}`,
				label: `${history.displayName} stable`,
				direction: 'stable',
				detail: `Holding at ${history.baseline.latestValueLabel}`,
			})
		}
	}

	return items.slice(0, 6)
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
			actionPath: ROUTES.healthImportReview,
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
				: `${ROUTES.ask}?q=${encodeURIComponent(item.title)}`,
		})
	}

	if (steps.length === 0) {
		steps.push({
			id: 'annual-checkup',
			title: 'Keep up regular checkups',
			reason:
				'Your latest records look stable. Annual labs help catch changes early.',
		})
	}

	return steps.slice(0, 4)
}

export function buildReportSummaries(
	reports: UploadedHealthReport[],
): HealthReportSummary[] {
	return [...reports]
		.filter((report) => report.status === 'completed')
		.sort(
			(a, b) =>
				Date.parse(getReportDisplayDate(b)) -
				Date.parse(getReportDisplayDate(a)),
		)
		.map((report) => {
			const parsed = getParsedHealthReport(report)
			const abnormal = (parsed?.metrics ?? [])
				.filter((metric) => ABNORMAL.has(metric.status))
				.slice(0, 3)
				.map(
					(metric) =>
						`${metric.displayName} ${metric.status === 'low' ? 'low' : 'elevated'}`,
				)

			return {
				id: report.id,
				title: getReportDisplayTitle(report),
				hospital: parsed?.metadata.laboratory ?? 'Medical center',
				doctor: parsed?.metadata.doctorName ?? undefined,
				date: getReportDisplayDate(report, parsed),
				displayDate: formatDisplayDate(getReportDisplayDate(report, parsed)),
				summary: parsed
					? `${parsed.metrics.length} results reviewed from this visit.`
					: 'Report imported and ready to review.',
				findings: abnormal,
				status: report.status,
				isReady: report.status === 'completed',
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
		const parsed = getParsedHealthReport(report)
		const date = getReportDisplayDate(report, parsed)

		events.push({
			id: `checkup-${report.id}`,
			date,
			displayDate: formatDisplayDate(date),
			title: getReportDisplayTitle(report),
			summary: parsed?.metadata.laboratory
				? `Annual checkup at ${parsed.metadata.laboratory}`
				: 'Health checkup completed',
			kind: 'checkup',
			reportId: report.id,
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

function buildNarrative(insights: ChronicleInsight[]): string[] {
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
		return [
			'Chronicle is reviewing your health records. Import more reports to unlock a fuller picture of your health journey.',
		]
	}

	return paragraphs.slice(0, 6)
}

export function buildHealthCompanionView(input: {
	graph: HealthKnowledgeGraph
	uploadedReports: UploadedHealthReport[]
	insights: ChronicleInsight[]
	needsReview?: number
}): HealthCompanionView {
	const needsReview = input.needsReview ?? 0
	const { status, detail, score } = deriveStatus({
		graph: input.graph,
		insights: input.insights,
		needsReview,
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
	const recentReports = buildReportSummaries(input.uploadedReports)
	const journeyEvents = buildJourneyEvents({
		reports: input.uploadedReports,
		graph: input.graph,
		changes,
	})

	return {
		status,
		statusDetail: detail,
		score,
		attention,
		changes,
		nextSteps: buildNextSteps({ attention, needsReview }),
		recentReports,
		journeyEvents,
		metricGroups: buildMetricGroups(input.graph),
		narrative: buildNarrative(input.insights),
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
