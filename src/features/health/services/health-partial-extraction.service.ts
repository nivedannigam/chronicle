import type { HealthMetric } from '@/features/health/domain/metric.types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import {
	healthReportQualifiesForMetriclessCompletion,
	reportQualifiesForMetriclessCompletion,
} from '@/features/health/services/report-readiness.service'
import type { UploadedHealthReport } from '@/features/health/types'

const FULL_BODY_PATTERN =
	/full\s*body|fully\s*body|health\s*checkup|full\s*body\s*checkup|aarogyam|comprehensive\s*health/i

const CORE_PANEL_IDS = new Set([
	'ldl',
	'hdl',
	'total-cholesterol',
	'triglycerides',
	'creatinine',
	'egfr',
	'urea',
	'tsh',
	'hba1c',
	'glucose',
	'random-glucose',
	'alt',
	'sgot',
	'ast',
	'sgpt',
])

export const PARTIAL_EXTRACTION_MIN_FULL_BODY_METRICS = 15

export function reportFilenameSuggestsFullBodyPanel(fileName: string): boolean {
	return FULL_BODY_PATTERN.test(fileName)
}

export function countCorePanelMarkers(metrics: HealthMetric[]): number {
	const ids = new Set(
		metrics.map((metric) => metric.canonicalId?.trim()).filter(Boolean),
	)

	let hits = 0

	for (const id of ids) {
		if (id && CORE_PANEL_IDS.has(id)) {
			hits += 1
		}
	}

	return hits
}

export function isSuspiciousPartialExtraction(input: {
	fileName: string
	metrics: HealthMetric[]
}): boolean {
	if (!reportFilenameSuggestsFullBodyPanel(input.fileName)) {
		return false
	}

	if (input.metrics.length < PARTIAL_EXTRACTION_MIN_FULL_BODY_METRICS) {
		return true
	}

	return countCorePanelMarkers(input.metrics) < 2
}

export function reportNeedsAiExtractionBackfill(
	report: UploadedHealthReport,
): boolean {
	if (report.status !== 'completed') {
		return false
	}

	if (reportQualifiesForMetriclessCompletion(report)) {
		return false
	}

	const parsed = getParsedHealthReport(report)
	const metrics = parsed?.metrics ?? []
	const extractionMethod = (
		parsed?.debug as { extractionMethod?: string } | undefined
	)?.extractionMethod

	if (
		(extractionMethod === 'llm' || extractionMethod === 'layout+llm') &&
		!isSuspiciousPartialExtraction({
			fileName: report.file_name,
			metrics,
		})
	) {
		return false
	}

	if (
		reportFilenameSuggestsFullBodyPanel(report.file_name) &&
		metrics.length < 20
	) {
		return true
	}

	return isSuspiciousPartialExtraction({
		fileName: report.file_name,
		metrics,
	})
}

export function shouldSkipAiMetricExtraction(input: {
	fileName: string
	metadata: { reportType?: string; laboratory?: string }
}): boolean {
	return healthReportQualifiesForMetriclessCompletion(input)
}
