import { FC } from '@/ui/figma/tokens/figma-v2-tokens'

export function figmaHealthScoreColor(score: number | null): string {
	if (score === null) return FC.blue
	if (score >= 85) return FC.green
	if (score >= 70) return FC.amber
	return FC.orange
}

export function figmaHealthStatusHeadline(
	status: import('@/features/health/types/health-companion.types').HealthStatusLabel,
): string {
	switch (status) {
		case 'Looking Good':
			return "You're in good health."
		case 'Improving':
			return "You're trending in the right direction."
		case 'Monitoring Required':
			return 'A few markers need watching.'
		case 'Partial Results':
			return 'Your results are still being organized.'
		case 'Awaiting Data':
			return 'Your health picture will fill in as more reports are added.'
		default:
			return 'Some results need your attention.'
	}
}

export function figmaMetricStatusColor(status: string): string {
	if (status === 'normal') return FC.green
	if (status === 'unknown') return FC.dim
	if (status === 'critical' || status === 'high') return FC.orange
	if (status === 'low' || status === 'borderline') return FC.amber
	return FC.mid
}

export function figmaMetricStatusLabel(
	status: string,
	trendLabel?: string,
): string {
	if (trendLabel) return trendLabel
	if (status === 'normal') return 'Normal'
	if (status === 'unknown') return 'Reviewing'
	if (status === 'low') return 'Low ↓'
	if (status === 'high') return 'Slightly high ↑'
	if (status === 'critical') return 'Above range ↑'
	if (status === 'borderline') return 'Borderline'
	return 'Tracked'
}

export function figmaJourneyEventColor(
	kind: import('@/features/health/types/health-companion.types').HealthJourneyEvent['kind'],
): string {
	switch (kind) {
		case 'finding':
		case 'review':
			return FC.amber
		case 'monitoring':
			return FC.blue
		default:
			return FC.green
	}
}
