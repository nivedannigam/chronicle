import { classifyReportType } from '@/features/health-intelligence/services/report-type.classifier'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'

const METRICLESS_COMPLETE_KINDS = new Set([
	'ecg',
	'radiology',
	'health_summary',
	'specialist_visit',
])

/** Shown when OCR succeeded but the lab parser found no metrics. */
export const NO_LAB_METRICS_EXTRACTED_MESSAGE =
	'OCR completed but no laboratory metrics were extracted from this report.'

export function textIndicatesMetriclessReportType(text: string): boolean {
	const normalized = text.toLowerCase()

	return (
		normalized.includes('ecg') ||
		normalized.includes('electrocardiogram') ||
		normalized.includes('ekg') ||
		normalized.includes('tmt') ||
		normalized.includes('treadmill') ||
		normalized.includes('stress test') ||
		normalized.includes('company wellness') ||
		normalized.includes('wellness plan') ||
		normalized.includes('wellness') ||
		normalized.includes('mri') ||
		normalized.includes(' ct ') ||
		normalized.includes('x-ray') ||
		normalized.includes('xray') ||
		normalized.includes('ultrasound') ||
		normalized.includes('radiology')
	)
}

export function reportQualifiesForMetriclessCompletion(
	report: UploadedHealthReport,
): boolean {
	if (METRICLESS_COMPLETE_KINDS.has(classifyReportType(report).kind)) {
		return true
	}

	const parsed = getParsedHealthReport(report)
	const searchable = [
		report.file_name,
		parsed?.metadata.reportType ?? '',
		parsed?.metadata.laboratory ?? '',
	].join(' ')

	return textIndicatesMetriclessReportType(searchable)
}

export function healthReportQualifiesForMetriclessCompletion(input: {
	metadata: { reportType?: string; laboratory?: string }
	fileName?: string
}): boolean {
	const searchable = [
		input.metadata.reportType ?? '',
		input.metadata.laboratory ?? '',
		input.fileName ?? '',
	].join(' ')

	return textIndicatesMetriclessReportType(searchable)
}

const PROCESSING_STATUSES = new Set([
	'uploaded',
	'queued',
	'processing',
	'parsed',
])

export type ReportPipelinePhase = 'pending' | 'processing' | 'failed' | 'ready'

export function getReportPipelinePhase(
	report: UploadedHealthReport,
): ReportPipelinePhase {
	if (report.status === 'failed') {
		return 'failed'
	}

	if (report.status === 'completed') {
		if (
			reportHasParsedObservations(report) ||
			reportQualifiesForMetriclessCompletion(report)
		) {
			return 'ready'
		}

		return 'processing'
	}

	if (PROCESSING_STATUSES.has(report.status)) {
		return 'processing'
	}

	return 'pending'
}

/** User-visible readiness — report finished processing and has displayable results. */
export function isReportDisplayReady(report: UploadedHealthReport): boolean {
	if (report.status !== 'completed') {
		return false
	}

	return (
		reportHasParsedObservations(report) ||
		reportQualifiesForMetriclessCompletion(report)
	)
}

export function isReportProcessing(report: UploadedHealthReport): boolean {
	return PROCESSING_STATUSES.has(report.status)
}

export function countDisplayReadyReports(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(isReportDisplayReady).length
}

export function countProcessingReports(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(isReportProcessing).length
}

/** Report finished OCR/parse but has no usable metrics and is not metricless-by-type. */
export function reportNeedsReprocess(report: UploadedHealthReport): boolean {
	if (isReportDisplayReady(report)) {
		return false
	}

	if (reportQualifiesForMetriclessCompletion(report)) {
		return false
	}

	if (report.status === 'failed') {
		return true
	}

	if (report.status === 'parsed') {
		return (
			!reportHasParsedObservations(report) || Boolean(report.processing_error)
		)
	}

	if (report.status === 'completed') {
		return !reportHasParsedObservations(report)
	}

	return false
}

export function countReportsNeedingReprocess(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(reportNeedsReprocess).length
}

export function reportHasParsedObservations(
	report: UploadedHealthReport,
): boolean {
	const parsed = getParsedHealthReport(report)

	return Boolean(parsed && parsed.metrics.length > 0)
}

export function reportHasExtractedText(report: UploadedHealthReport): boolean {
	return Boolean(report.extracted_text?.trim())
}

export interface ReportArtifactStatus {
	reportId: string
	phase: ReportPipelinePhase
	hasOcrText: boolean
	hasParsedObservations: boolean
	hasStoredMetrics: boolean
	hasActionableMetrics: boolean
	isDisplayReady: boolean
	processingError: string | null
}

export function assessReportArtifacts(input: {
	report: UploadedHealthReport
	storedMetricCount?: number
}): ReportArtifactStatus {
	const { report } = input
	const storedMetricCount = input.storedMetricCount ?? 0

	return {
		reportId: report.id,
		phase: getReportPipelinePhase(report),
		hasOcrText: reportHasExtractedText(report),
		hasParsedObservations: reportHasParsedObservations(report),
		hasStoredMetrics: storedMetricCount > 0,
		isDisplayReady: isReportDisplayReady(report),
		hasActionableMetrics:
			reportHasParsedObservations(report) || storedMetricCount > 0,
		processingError: report.processing_error ?? null,
	}
}

export function metricsDisplayMessage(input: {
	report: UploadedHealthReport
	storedMetricCount: number
}): string {
	const phase = getReportPipelinePhase(input.report)

	if (phase === 'processing') {
		if (
			input.report.status === 'completed' &&
			!reportHasParsedObservations(input.report) &&
			!reportQualifiesForMetriclessCompletion(input.report)
		) {
			return 'No laboratory metrics detected.'
		}

		return 'Metrics are still being processed.'
	}

	if (phase === 'failed') {
		return input.report.processing_error ?? 'Processing failed for this report.'
	}

	if (input.storedMetricCount > 0) {
		return ''
	}

	if (reportHasParsedObservations(input.report)) {
		return 'No laboratory metrics detected.'
	}

	return 'No laboratory metrics detected.'
}
