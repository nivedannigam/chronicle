import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import type {
	HealthMetricHistory,
	HealthKnowledgeGraph,
} from '@/features/health-knowledge/types'
import {
	computeHealthScoreFromHistories,
	latestObservation,
} from '@/features/health-knowledge/services/health-scoring.service'

/** Consumer-facing overall status — used on every Health screen. */
export type ConsumerOverallStatus =
	'Excellent' | 'Good' | 'Monitor' | 'Needs Attention' | 'Still Learning'

/** Consumer-facing domain status — used on Progress and widgets. */
export type ConsumerDomainStatus =
	'Excellent' | 'Good' | 'Monitor' | 'Needs Attention' | 'No Recent Data'

export type ConsumerTrendLabel =
	'Improving' | 'Stable' | 'Monitor' | 'Still Learning'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

export function deriveConsumerOverallStatus(input: {
	companion: HealthCompanionView
	score: number | null
}): ConsumerOverallStatus {
	const { companion, score } = input

	if (
		companion.status === 'Awaiting Data' ||
		companion.status === 'Partial Results' ||
		score === null
	) {
		return 'Still Learning'
	}

	if (companion.status === 'Needs Attention') {
		return 'Needs Attention'
	}

	if (companion.status === 'Monitoring Required') {
		return 'Monitor'
	}

	if (score !== null && score >= 90 && companion.status === 'Looking Good') {
		return 'Excellent'
	}

	if (companion.status === 'Improving' || companion.status === 'Looking Good') {
		return 'Good'
	}

	if (score !== null && score >= 70) {
		return 'Good'
	}

	return 'Monitor'
}

export function consumerOverallSummary(status: ConsumerOverallStatus): string {
	switch (status) {
		case 'Excellent':
			return 'Your health looks excellent based on your latest results.'
		case 'Good':
			return "You're doing well — most markers are in a healthy range."
		case 'Monitor':
			return 'A few areas are worth keeping an eye on.'
		case 'Needs Attention':
			return 'Some results deserve a closer look with your doctor.'
		case 'Still Learning':
		default:
			return 'Your health picture will fill in as more reports are added.'
	}
}

export function deriveConsumerTrendLabel(input: {
	companion: HealthCompanionView
	score: number | null
}): ConsumerTrendLabel {
	if (input.companion.status === 'Improving') {
		return 'Improving'
	}

	if (
		input.companion.status === 'Awaiting Data' ||
		input.companion.status === 'Partial Results' ||
		input.score === null
	) {
		return 'Still Learning'
	}

	if (input.companion.status === 'Needs Attention') {
		return 'Monitor'
	}

	return 'Stable'
}

export function consumerDomainStatus(
	histories: HealthMetricHistory[],
): ConsumerDomainStatus {
	if (histories.length === 0) {
		return 'No Recent Data'
	}

	const latestStatuses = histories
		.map((history) => latestObservation(history))
		.filter(Boolean)

	if (latestStatuses.some((obs) => obs?.status === 'critical')) {
		return 'Needs Attention'
	}

	if (latestStatuses.some((obs) => ABNORMAL.has(obs?.status ?? ''))) {
		return 'Monitor'
	}

	if (
		latestStatuses.length > 0 &&
		latestStatuses.every((obs) => obs?.status === 'normal')
	) {
		if (histories.some((history) => history.trend.direction === 'improving')) {
			return 'Excellent'
		}

		return 'Good'
	}

	if (histories.some((history) => history.trend.direction === 'improving')) {
		return 'Good'
	}

	const hasObservations = histories.some(
		(history) => history.observations.length > 0,
	)

	if (hasObservations) {
		return 'Monitor'
	}

	return 'No Recent Data'
}

export function consumerDomainTrendLabel(
	histories: HealthMetricHistory[],
): string {
	if (histories.length === 0) {
		return '—'
	}

	const latestStatuses = histories
		.map((history) => latestObservation(history))
		.filter(Boolean)

	if (
		latestStatuses.length > 0 &&
		latestStatuses.every((obs) => obs?.status === 'normal')
	) {
		if (histories.some((history) => history.trend.direction === 'improving')) {
			return 'Improving'
		}

		return 'Stable'
	}

	if (latestStatuses.some((obs) => ABNORMAL.has(obs?.status ?? ''))) {
		return 'Monitor'
	}

	return 'Stable'
}

/** Latest observation date across all histories in a domain. */
export function newestObservationDate(
	histories: HealthMetricHistory[],
): string | undefined {
	let newest: string | undefined

	for (const history of histories) {
		for (const observation of history.observations) {
			const observedAt = observation.observedAt

			if (!observedAt) {
				continue
			}

			if (!newest || Date.parse(observedAt) > Date.parse(newest)) {
				newest = observedAt
			}
		}
	}

	return newest
}

export function relativeConsumerUpdatedLabel(
	value: string | undefined,
): string | null {
	if (!value?.trim()) {
		return null
	}

	const parsed = Date.parse(value)

	if (Number.isNaN(parsed)) {
		return null
	}

	const now = Date.now()
	const diffMs = now - parsed
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (days < 0) {
		return 'From your latest visit'
	}

	if (days === 0) {
		return 'Updated today'
	}

	if (days === 1) {
		return 'Updated yesterday'
	}

	if (days < 7) {
		return `Updated ${days} days ago`
	}

	const formatted = new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		year: 'numeric',
	})

	return `Updated ${formatted}`
}

export function buildCanonicalHealthScore(
	graph: HealthKnowledgeGraph,
): number | null {
	return computeHealthScoreFromHistories(graph.profile.metricHistories)
}
