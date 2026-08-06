import type { HealthVisitSnapshot } from '@/features/health-knowledge/services/health-snapshot.service'

function softenStatus(status: string): string {
	switch (status) {
		case 'low':
			return 'below range'
		case 'high':
			return 'above range'
		case 'critical':
			return 'critically out of range'
		case 'borderline':
			return 'borderline'
		default:
			return 'noted'
	}
}

export function buildReportHealthImpact(
	snapshot: HealthVisitSnapshot | undefined,
): string | null {
	if (!snapshot) {
		return null
	}

	const abnormal = snapshot.majorMetrics.filter((metric) =>
		['low', 'high', 'critical', 'borderline'].includes(metric.status),
	)

	if (abnormal.length > 0) {
		const highlights = abnormal
			.slice(0, 2)
			.map(
				(metric) =>
					`${metric.displayName} is ${softenStatus(metric.status)} (${metric.value})`,
			)
			.join('; ')

		return `This report highlights ${abnormal.length} area${abnormal.length === 1 ? '' : 's'} worth discussing with your doctor — ${highlights}.`
	}

	if (snapshot.healthScore != null && snapshot.healthScore >= 85) {
		return 'Results from this report are broadly in a healthy range and support your overall picture.'
	}

	if (snapshot.majorMetrics.length > 0) {
		return `Chronicle organized ${snapshot.majorMetrics.length} result${snapshot.majorMetrics.length === 1 ? '' : 's'} from this report into your health timeline.`
	}

	return 'This report adds to your health timeline and will inform future visits.'
}

export function buildReportFindingLabels(
	snapshot: HealthVisitSnapshot | undefined,
): string[] {
	if (!snapshot) {
		return []
	}

	return snapshot.importantFindings.slice(0, 4).map((finding) =>
		finding
			.replace(/\blow\b/gi, 'below range')
			.replace(/\bhigh\b/gi, 'above range')
			.replace(/\bcritical\b/gi, 'critically out of range'),
	)
}
