import { C } from '@/constants/colors'
import {
	getParsedHealthReport,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import { buildDerivedInsights } from '@/features/health-knowledge/engines/insights.engine'
import {
	calculateBaseline,
	calculateTrend,
	mapTrendToSnapshotTrend,
} from '@/features/health-knowledge/engines/trend.engine'
import {
	findMetricDefinitionById,
	getCategoryMeta,
	getHealthMetricDefinitions,
	getMetricCategories,
	mapCategoryId,
} from '@/features/health-knowledge/graph/metric-categories'
import { getMetricRelationships } from '@/features/health-knowledge/graph/metric-relationships'
import type { KnowledgeGraphBuilder } from '@chronicle/core-knowledge'
import type {
	BuildHealthKnowledgeInput,
	CategorySnapshot,
	HealthAlert,
	HealthKnowledgeGraph,
	HealthMetricHistory,
	HealthObservation,
	MetricCategoryId,
	PersonHealthProfile,
} from '@/features/health-knowledge/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

const CACHE_VERSION = '1'

function formatDisplayDate(value: string | null | undefined): string {
	if (!value) {
		return '—'
	}

	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function slugifyMetricId(rawName: string): string {
	return rawName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}

function buildSourceKey(
	uploadedReports: UploadedHealthReport[],
	storedMetrics: StoredHealthMetric[],
): string {
	const uploadKey = uploadedReports
		.map(
			(report) =>
				`${report.id}:${report.status}:${report.processed_at ?? report.uploaded_at}`,
		)
		.join('|')
	const metricsKey = storedMetrics
		.map(
			(metric) =>
				`${metric.id}:${metric.report_id}:${metric.canonical_metric_id}:${metric.observed_at}`,
		)
		.join('|')

	return `${uploadKey}::${metricsKey}`
}

function observationsFromStoredMetrics(
	metrics: StoredHealthMetric[],
	uploadedReports: UploadedHealthReport[],
): HealthObservation[] {
	const reportById = new Map(
		uploadedReports.map((report) => [report.id, report]),
	)

	return metrics.map((metric) => {
		const report = reportById.get(metric.report_id)

		return {
			id: metric.id,
			canonicalMetricId: metric.canonical_metric_id,
			displayName: metric.display_name,
			rawName: metric.raw_name,
			value: metric.value,
			numericValue: metric.numeric_value,
			unit: metric.unit,
			status: metric.status,
			confidence: metric.confidence,
			observedAt: metric.observed_at,
			reportId: metric.report_id,
			reportTitle: report ? getReportDisplayTitle(report) : 'Health Report',
			laboratory: report
				? (getParsedHealthReport(report)?.metadata.laboratory ?? '')
				: '',
			referenceRange: metric.reference_range_raw ?? '',
		}
	})
}

function observationsFromUploadedReports(
	reports: UploadedHealthReport[],
): HealthObservation[] {
	const observations: HealthObservation[] = []

	for (const report of reports.filter((item) => item.status === 'completed')) {
		const parsed = getParsedHealthReport(report)

		if (!parsed) {
			continue
		}

		for (const [index, metric] of (parsed.metrics ?? []).entries()) {
			const canonicalMetricId =
				metric.canonicalId ?? `raw:${slugifyMetricId(metric.rawName)}`

			observations.push({
				id: `${report.id}-${canonicalMetricId}-${index}`,
				canonicalMetricId,
				displayName: metric.displayName,
				rawName: metric.rawName,
				value: metric.value,
				numericValue: metric.numericValue,
				unit: metric.unit,
				status: metric.status,
				confidence: metric.confidence,
				observedAt:
					parsed.metadata.reportDate ??
					report.report_date ??
					report.processed_at ??
					report.uploaded_at,
				reportId: report.id,
				reportTitle: getReportDisplayTitle(report),
				laboratory: parsed.metadata.laboratory,
				referenceRange: metric.referenceRange?.rawText ?? '',
			})
		}
	}

	return observations
}

function dedupeObservations(
	observations: HealthObservation[],
): HealthObservation[] {
	const seen = new Map<string, HealthObservation>()

	for (const observation of observations) {
		const key = `${observation.reportId}:${observation.canonicalMetricId}`
		seen.set(key, observation)
	}

	return [...seen.values()].sort(
		(a, b) =>
			new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
	)
}

function resolveCategoryId(canonicalMetricId: string): MetricCategoryId {
	const definition = findMetricDefinitionById(canonicalMetricId)

	if (definition) {
		return definition.categoryId
	}

	if (canonicalMetricId.startsWith('raw:')) {
		return 'blood'
	}

	return mapCategoryId(canonicalMetricId.split('-')[0] ?? 'blood')
}

function buildMetricHistories(
	observations: HealthObservation[],
): HealthMetricHistory[] {
	const grouped = new Map<string, HealthObservation[]>()

	for (const observation of observations) {
		const existing = grouped.get(observation.canonicalMetricId) ?? []
		existing.push(observation)
		grouped.set(observation.canonicalMetricId, existing)
	}

	return [...grouped.entries()]
		.map(([canonicalMetricId, metricObservations]) => {
			const sorted = [...metricObservations].sort(
				(a, b) =>
					new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
			)
			const definition = findMetricDefinitionById(canonicalMetricId)
			const latest = sorted[sorted.length - 1]

			return {
				canonicalMetricId,
				displayName: definition?.displayName ?? latest.displayName,
				categoryId: resolveCategoryId(canonicalMetricId),
				unit: latest.unit ?? definition?.defaultUnit ?? null,
				observations: sorted,
				trend: calculateTrend(sorted),
				baseline: calculateBaseline(sorted),
				linkedReportIds: [...new Set(sorted.map((item) => item.reportId))],
			}
		})
		.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

function summarizeCategoryStatus(histories: HealthMetricHistory[]): string {
	const latestAbnormal = histories
		.map((history) => history.observations[history.observations.length - 1])
		.find(
			(observation) =>
				observation &&
				(observation.status === 'low' ||
					observation.status === 'high' ||
					observation.status === 'critical' ||
					observation.status === 'borderline'),
		)

	if (latestAbnormal) {
		return `${latestAbnormal.displayName} ${latestAbnormal.status}`
	}

	if (histories.length === 0) {
		return 'No recent data'
	}

	return 'Normal'
}

function buildCategorySnapshots(
	histories: HealthMetricHistory[],
): CategorySnapshot[] {
	const categories = getMetricCategories()

	return categories.map((category) => {
		const categoryHistories = histories.filter(
			(history) => history.categoryId === category.id,
		)
		const historyCount = categoryHistories.reduce(
			(sum, history) => sum + history.observations.length,
			0,
		)
		const latestHistory = [...categoryHistories].sort((a, b) => {
			const aDate = a.baseline.lastObservedAt ?? ''
			const bDate = b.baseline.lastObservedAt ?? ''

			return new Date(bDate).getTime() - new Date(aDate).getTime()
		})[0]

		const trendDirection = latestHistory?.trend.direction ?? 'unknown'
		const meta = getCategoryMeta(category.id)

		return {
			categoryId: category.id,
			name: meta.name,
			emoji: meta.emoji,
			color: meta.color,
			latestValue: latestHistory?.baseline.latestValueLabel ?? '—',
			trend: trendDirection,
			historyCount,
			lastUpdated: formatDisplayDate(latestHistory?.baseline.lastObservedAt),
			statusLabel: summarizeCategoryStatus(categoryHistories),
			metricCount: categoryHistories.length,
		}
	})
}

function countAbnormalReports(observations: HealthObservation[]): number {
	const abnormalReportIds = new Set<string>()

	for (const observation of observations) {
		if (
			observation.status === 'low' ||
			observation.status === 'high' ||
			observation.status === 'critical' ||
			observation.status === 'borderline'
		) {
			abnormalReportIds.add(observation.reportId)
		}
	}

	return abnormalReportIds.size
}

function buildAlerts(histories: HealthMetricHistory[]): HealthAlert[] {
	const alerts: HealthAlert[] = []

	for (const history of histories) {
		const latest = history.observations[history.observations.length - 1]

		if (!latest) {
			continue
		}

		if (
			latest.status === 'low' ||
			latest.status === 'high' ||
			latest.status === 'critical' ||
			latest.status === 'borderline'
		) {
			alerts.push({
				id: `alert-${history.canonicalMetricId}-${latest.reportId}`,
				metricId: history.canonicalMetricId,
				severity:
					latest.status === 'critical' || latest.status === 'high'
						? 'critical'
						: 'attention',
				message: `${latest.displayName} is ${latest.status} (${latest.value})`,
				observedAt: latest.observedAt,
				reportId: latest.reportId,
			})
		}
	}

	return alerts
}

export function buildHealthKnowledgeGraph(
	input: BuildHealthKnowledgeInput,
): HealthKnowledgeGraph {
	const storedMetricObservations = observationsFromStoredMetrics(
		input.storedMetrics ?? [],
		input.uploadedReports,
	)
	const observations = dedupeObservations(
		storedMetricObservations.length > 0
			? storedMetricObservations
			: observationsFromUploadedReports(input.uploadedReports),
	)

	const metricHistories = buildMetricHistories(observations)
	const categories = buildCategorySnapshots(metricHistories)
	const reportIds = [
		...new Set(
			input.uploadedReports
				.filter((report) => report.status === 'completed')
				.map((report) => report.id),
		),
	]

	const profile: PersonHealthProfile = {
		personId: input.personId,
		metricHistories,
		categories,
		insights: buildDerivedInsights(
			metricHistories,
			countAbnormalReports(observations),
		),
		alerts: buildAlerts(metricHistories),
		relationships: getMetricRelationships(),
		reportIds,
		generatedAt: new Date().toISOString(),
		cacheVersion: CACHE_VERSION,
	}

	return {
		profile,
		metricDefinitions: getHealthMetricDefinitions(),
		metricCategories: getMetricCategories(),
	}
}

export const healthKnowledgeGraphBuilder: KnowledgeGraphBuilder<
	BuildHealthKnowledgeInput,
	HealthKnowledgeGraph
> = {
	domain: 'health',
	build: buildHealthKnowledgeGraph,
}

export function buildHealthKnowledgeSourceKey(
	uploadedReports: UploadedHealthReport[],
	storedMetrics: StoredHealthMetric[] = [],
): string {
	return buildSourceKey(uploadedReports, storedMetrics)
}

export function categorySnapshotsToHealthSnapshots(
	categories: CategorySnapshot[],
): import('@/features/health/types').HealthSnapshot[] {
	return categories.map((category) => ({
		id: category.categoryId,
		emoji: category.emoji,
		name: category.name,
		status: category.statusLabel,
		trend: mapTrendToSnapshotTrend(category.trend),
		latestResultDate: category.lastUpdated,
		color: category.color,
		latestValue: category.latestValue,
		historyCount: category.historyCount,
	}))
}

export function derivedInsightsToHealthInsights(
	insights: import('@/features/health-knowledge/types').DerivedHealthInsight[],
): import('@/features/health/types').HealthInsight[] {
	return insights.map((insight) => ({
		id: insight.id,
		text: insight.text,
		tone: insight.tone,
	}))
}

export function metricHistoriesToTrendSeries(
	histories: HealthMetricHistory[],
): import('@/features/health/types').TrendSeries[] {
	const colorByCategory: Record<MetricCategoryId, string> = {
		heart: C.red,
		liver: C.orange,
		kidney: C.teal,
		diabetes: C.yellow,
		thyroid: C.accentBlue,
		vitamin: C.greenAlt,
		blood: C.photos,
	}

	return histories
		.filter(
			(history) =>
				history.observations.filter(
					(observation) => observation.numericValue != null,
				).length >= 2,
		)
		.slice(0, 8)
		.map((history) => ({
			id: history.canonicalMetricId,
			name: history.displayName,
			unit: history.unit ?? '',
			color: colorByCategory[history.categoryId] ?? C.accent,
			values: history.observations
				.filter((observation) => observation.numericValue != null)
				.map((observation) => ({
					date: observation.observedAt,
					label: new Date(observation.observedAt).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: '2-digit',
					}),
					value: observation.numericValue!,
					reportId: observation.reportId,
				})),
		}))
}
