import { getCategoryMeta } from '@/features/health-knowledge/graph/metric-categories'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import type {
	MetricHistoryRecord,
	TimelineEvent,
	YearTimelineGroup,
} from '@/features/semantic-memory/types/semantic-memory.types'

function formatPercent(value: number | null): string {
	if (value == null) {
		return '—'
	}

	return `${Math.round(value * 100)}%`
}

function isAbnormal(status: string): boolean {
	return ['low', 'high', 'critical', 'borderline'].includes(status)
}

export function buildMetricHistoryRecords(
	histories: HealthMetricHistory[],
): MetricHistoryRecord[] {
	return histories
		.filter((history) => history.observations.length > 0)
		.map((history) => {
			const latest = history.observations[history.observations.length - 1]!
			const previous =
				history.observations.length > 1
					? history.observations[history.observations.length - 2]!
					: null

			return {
				canonicalId: history.canonicalMetricId,
				displayName: history.displayName,
				categoryId: history.categoryId,
				unit: history.unit,
				latestValue: latest.value,
				previousValue: previous?.value ?? null,
				trend: history.trend.description,
				trendDirection: history.trend.direction,
				highest:
					history.baseline.highest != null
						? String(history.baseline.highest)
						: null,
				lowest:
					history.baseline.lowest != null
						? String(history.baseline.lowest)
						: null,
				average:
					history.baseline.average != null
						? String(history.baseline.average)
						: null,
				latestStatus: latest.status,
				previousStatus: previous?.status ?? null,
				latestObservedAt: latest.observedAt,
				previousObservedAt: previous?.observedAt ?? null,
				dataPointCount: history.observations.length,
				changePercent: formatPercent(history.trend.changePercent),
				linkedReportIds: history.linkedReportIds,
			}
		})
}

export function buildYearTimeline(
	histories: HealthMetricHistory[],
): YearTimelineGroup[] {
	const events: TimelineEvent[] = []

	for (const history of histories) {
		events.push(...metricChangeEvents(history))
	}

	events.push(...categoryEvents(histories))

	const byYear = new Map<number, TimelineEvent[]>()

	for (const event of events.sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
	)) {
		const bucket = byYear.get(event.year) ?? []
		bucket.push(event)
		byYear.set(event.year, bucket)
	}

	return [...byYear.entries()]
		.sort(([leftYear], [rightYear]) => leftYear - rightYear)
		.map(([year, yearEvents]) => ({
			year,
			events: dedupeTimelineEvents(yearEvents),
		}))
}

function metricChangeEvents(history: HealthMetricHistory): TimelineEvent[] {
	const events: TimelineEvent[] = []

	for (let index = 1; index < history.observations.length; index += 1) {
		const previous = history.observations[index - 1]!
		const current = history.observations[index]!
		const year = new Date(current.observedAt).getFullYear()
		const wasAbnormal = isAbnormal(previous.status)
		const isNowAbnormal = isAbnormal(current.status)

		if (!wasAbnormal && isNowAbnormal) {
			events.push({
				id: `event-new-abnormal-${current.id}`,
				year,
				date: current.observedAt,
				label: `${history.displayName} elevated (${current.value})`,
				kind: 'finding',
				metricId: history.canonicalMetricId,
				categoryId: history.categoryId,
				status: current.status,
				reportId: current.reportId,
				reportTitle: current.reportTitle,
				evidence: `${previous.value} → ${current.value}`,
			})
		}

		if (wasAbnormal && !isNowAbnormal) {
			events.push({
				id: `event-resolved-${current.id}`,
				year,
				date: current.observedAt,
				label: `${history.displayName} normalized (${current.value})`,
				kind: 'resolution',
				metricId: history.canonicalMetricId,
				categoryId: history.categoryId,
				status: current.status,
				reportId: current.reportId,
				reportTitle: current.reportTitle,
				evidence: `${previous.value} → ${current.value}`,
			})
		}

		if (
			history.trend.direction === 'improving' &&
			index === history.observations.length - 1 &&
			history.observations.length >= 2
		) {
			events.push({
				id: `event-improving-${history.canonicalMetricId}-${current.id}`,
				year,
				date: current.observedAt,
				label: `${history.displayName} improved (${current.value})`,
				kind: 'improvement',
				metricId: history.canonicalMetricId,
				categoryId: history.categoryId,
				status: current.status,
				reportId: current.reportId,
				reportTitle: current.reportTitle,
				evidence: history.trend.description,
			})
		}
	}

	return events
}

function categoryEvents(histories: HealthMetricHistory[]): TimelineEvent[] {
	const events: TimelineEvent[] = []
	const categoryAbnormal = new Map<
		string,
		{ date: string; metrics: string[]; reportId: string; reportTitle: string }
	>()

	for (const history of histories) {
		const latest = history.observations[history.observations.length - 1]

		if (!latest || !isAbnormal(latest.status)) {
			continue
		}

		const key = `${history.categoryId}:${latest.observedAt.slice(0, 7)}`
		const existing = categoryAbnormal.get(key)

		if (existing) {
			existing.metrics.push(history.displayName)
		} else {
			categoryAbnormal.set(key, {
				date: latest.observedAt,
				metrics: [history.displayName],
				reportId: latest.reportId,
				reportTitle: latest.reportTitle,
			})
		}
	}

	for (const [key, value] of categoryAbnormal.entries()) {
		const categoryId = key.split(':')[0]!
		const meta = getCategoryMeta(categoryId as never)
		const year = new Date(value.date).getFullYear()

		if (categoryId === 'liver' && value.metrics.length >= 1) {
			events.push({
				id: `event-category-liver-${value.date}`,
				year,
				date: value.date,
				label: 'Fatty liver indicators detected',
				kind: 'category',
				categoryId,
				reportId: value.reportId,
				reportTitle: value.reportTitle,
				evidence: value.metrics.join(', '),
			})
		} else if (
			categoryId === 'heart' &&
			value.metrics.some((m) => /ldl/i.test(m))
		) {
			events.push({
				id: `event-category-ldl-${value.date}`,
				year,
				date: value.date,
				label: 'Elevated LDL',
				kind: 'category',
				categoryId,
				reportId: value.reportId,
				reportTitle: value.reportTitle,
				evidence: value.metrics.join(', '),
			})
		} else if (meta) {
			events.push({
				id: `event-category-${categoryId}-${value.date}`,
				year,
				date: value.date,
				label: `${meta.name} findings noted`,
				kind: 'category',
				categoryId,
				reportId: value.reportId,
				reportTitle: value.reportTitle,
				evidence: value.metrics.join(', '),
			})
		}
	}

	return events
}

function dedupeTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
	const seen = new Set<string>()

	return events.filter((event) => {
		const key = `${event.kind}:${event.label}:${event.date.slice(0, 10)}`

		if (seen.has(key)) {
			return false
		}

		seen.add(key)
		return true
	})
}

export function formatTimelineForSummary(
	groups: YearTimelineGroup[],
): string[] {
	return groups.flatMap((group) => [
		`${group.year}: ${group.events.map((event) => event.label).join('; ')}`,
	])
}
