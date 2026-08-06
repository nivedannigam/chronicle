import type {
	HealthMetricHistory,
	HealthObservation,
	MetricCategoryId,
} from '@/features/health-knowledge/types'
import {
	consumerDomainStatus,
	consumerDomainTrendLabel,
} from '@/features/health/services/health-consumer-status.service'

export const MIN_CLASSIFIED_FOR_SCORE = 5

export function latestObservation(
	history: HealthMetricHistory,
): HealthObservation | undefined {
	return history.observations[history.observations.length - 1]
}

/** Single health score from metric histories — latest observation per metric. */
export function computeHealthScoreFromHistories(
	histories: HealthMetricHistory[],
): number | null {
	let normalCount = 0
	let classifiedCount = 0

	for (const history of histories) {
		const latest = latestObservation(history)

		if (!latest?.status || latest.status === 'unknown') {
			continue
		}

		classifiedCount += 1

		if (latest.status === 'normal') {
			normalCount += 1
		}
	}

	if (classifiedCount < MIN_CLASSIFIED_FOR_SCORE) {
		return null
	}

	return Math.round((normalCount / classifiedCount) * 100)
}

export function pickMostRecentHistory(
	histories: HealthMetricHistory[],
): HealthMetricHistory | undefined {
	return [...histories].sort((left, right) => {
		const leftDate = Date.parse(left.baseline.lastObservedAt ?? '')
		const rightDate = Date.parse(right.baseline.lastObservedAt ?? '')

		return rightDate - leftDate
	})[0]
}

export function domainStatusLabel(histories: HealthMetricHistory[]): string {
	return consumerDomainStatus(histories)
}

/** Trend label based on latest evidence — stale decline does not override recovery. */
export function domainTrendLabel(histories: HealthMetricHistory[]): string {
	return consumerDomainTrendLabel(histories)
}

export function filterHistoriesByCategory(
	histories: HealthMetricHistory[],
	categoryId: MetricCategoryId,
	metricFilter?: Set<string>,
): HealthMetricHistory[] {
	let filtered = histories.filter(
		(history) => history.categoryId === categoryId,
	)

	if (metricFilter) {
		filtered = filtered.filter((history) =>
			metricFilter.has(history.canonicalMetricId),
		)
	}

	return filtered
}

export function newestObservedAt(
	histories: HealthMetricHistory[],
): string | undefined {
	let newest: string | undefined

	for (const history of histories) {
		const observedAt = history.baseline.lastObservedAt

		if (!observedAt) {
			continue
		}

		if (!newest || Date.parse(observedAt) > Date.parse(newest)) {
			newest = observedAt
		}
	}

	return newest
}
