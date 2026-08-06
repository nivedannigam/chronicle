import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import type { HealthObservation } from '@/features/health-knowledge/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

function slugifyMetricId(rawName: string): string {
	return rawName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}

/** Remap unknown/raw stored IDs to canonical when raw label matches a definition. */
export function resolveCanonicalMetricId(
	rawName: string,
	existingId: string | null | undefined,
): string {
	if (
		existingId &&
		!existingId.startsWith('unknown-') &&
		!existingId.startsWith('raw:')
	) {
		return existingId
	}

	const normalized = normalizeMetricName(rawName)

	if (normalized.canonicalId) {
		return normalized.canonicalId
	}

	if (existingId?.startsWith('raw:')) {
		const fromSlug = normalizeMetricName(existingId.slice(4).replace(/-/g, ' '))

		if (fromSlug.canonicalId) {
			return fromSlug.canonicalId
		}
	}

	return existingId ?? `raw:${slugifyMetricId(rawName)}`
}

function observationDateFromReport(report: UploadedHealthReport): string {
	const parsed = getParsedHealthReport(report)
	const displayDate = getReportDisplayDate(report, parsed)

	return `${displayDate}T12:00:00.000Z`
}

function observationTimestamp(observation: HealthObservation): number {
	const parsed = Date.parse(observation.observedAt)
	return Number.isNaN(parsed) ? 0 : parsed
}

/** Prefer newer evidence; on tie prefer parsed over stored. */
function pickPreferredObservation(
	current: HealthObservation,
	candidate: HealthObservation,
): HealthObservation {
	const currentTime = observationTimestamp(current)
	const candidateTime = observationTimestamp(candidate)

	if (candidateTime > currentTime) {
		return candidate
	}

	if (candidateTime < currentTime) {
		return current
	}

	if (candidate.source === 'parsed' && current.source !== 'parsed') {
		return candidate
	}

	return current
}

export function observationsFromStoredMetrics(
	metrics: StoredHealthMetric[],
	uploadedReports: UploadedHealthReport[],
): HealthObservation[] {
	const reportById = new Map(
		uploadedReports.map((report) => [report.id, report]),
	)

	return metrics.map((metric) => {
		const report = reportById.get(metric.report_id)
		const canonicalMetricId = resolveCanonicalMetricId(
			metric.raw_name,
			metric.canonical_metric_id,
		)

		return {
			id: metric.id,
			canonicalMetricId,
			displayName: metric.display_name,
			rawName: metric.raw_name,
			value: metric.value,
			numericValue: metric.numeric_value,
			unit: metric.unit,
			status: metric.status,
			confidence: metric.confidence,
			observedAt: report
				? observationDateFromReport(report)
				: metric.observed_at,
			reportId: metric.report_id,
			reportTitle: report ? getReportDisplayTitle(report) : 'Health Report',
			laboratory: report
				? (getParsedHealthReport(report)?.metadata.laboratory ?? '')
				: '',
			referenceRange: metric.reference_range_raw ?? '',
			source: 'stored' as const,
		}
	})
}

export function observationsFromUploadedReports(
	reports: UploadedHealthReport[],
): HealthObservation[] {
	const observations: HealthObservation[] = []

	for (const report of reports.filter((item) => item.status === 'completed')) {
		const parsed = getParsedHealthReport(report)

		if (!parsed) {
			continue
		}

		for (const [index, metric] of (parsed.metrics ?? []).entries()) {
			const canonicalMetricId = resolveCanonicalMetricId(
				metric.rawName,
				metric.canonicalId,
			)

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
				observedAt: observationDateFromReport(report),
				reportId: report.id,
				reportTitle: getReportDisplayTitle(report),
				laboratory: parsed.metadata.laboratory,
				referenceRange: metric.referenceRange?.rawText ?? '',
				source: 'parsed' as const,
			})
		}
	}

	return observations
}

/** Merge stored + parsed observations; newest valid evidence wins per report/metric. */
export function mergeHealthObservations(input: {
	storedMetrics: StoredHealthMetric[]
	uploadedReports: UploadedHealthReport[]
}): HealthObservation[] {
	const stored = observationsFromStoredMetrics(
		input.storedMetrics,
		input.uploadedReports,
	)
	const parsed = observationsFromUploadedReports(input.uploadedReports)
	const merged = new Map<string, HealthObservation>()

	for (const observation of [...stored, ...parsed]) {
		const key = `${observation.reportId}:${observation.canonicalMetricId}`
		const existing = merged.get(key)

		if (!existing) {
			merged.set(key, observation)
			continue
		}

		merged.set(key, pickPreferredObservation(existing, observation))
	}

	return [...merged.values()].sort(
		(a, b) => observationTimestamp(a) - observationTimestamp(b),
	)
}
