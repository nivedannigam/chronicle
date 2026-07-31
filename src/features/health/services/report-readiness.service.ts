import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'

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
		return 'ready'
	}

	if (PROCESSING_STATUSES.has(report.status)) {
		return 'processing'
	}

	return 'pending'
}

/** User-visible readiness — report finished all required downstream processing. */
export function isReportDisplayReady(report: UploadedHealthReport): boolean {
	return report.status === 'completed'
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
		processingError: report.processing_error ?? null,
	}
}

export function metricsDisplayMessage(input: {
	report: UploadedHealthReport
	storedMetricCount: number
}): string {
	const phase = getReportPipelinePhase(input.report)

	if (phase === 'processing') {
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
