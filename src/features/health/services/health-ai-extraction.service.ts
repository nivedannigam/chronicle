import type { HealthReport } from '@/features/document-intelligence/domain/health-report.domain'
import type {
	HealthMetric,
	MetricStatus,
} from '@/features/document-intelligence/domain/metric.types'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import {
	invokeExtractMetricsAiEdgeFunction,
	type ExtractMetricsAiEdgeMetric,
	ExtractMetricsAiInvokeError,
} from '@/shared/ai/transport/extract-metrics-ai-edge.client'
import type { UploadedHealthReport } from '@/features/health/types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import {
	healthReportQualifiesForMetriclessCompletion,
	reportHasExtractedText,
	reportNeedsReprocess,
} from '@/features/health/services/report-readiness.service'

/** Shown when standard reading failed before any text was stored. */
export const OCR_FAILED_USER_MESSAGE =
	"We couldn't read this document using our standard reader."

/** Shown when standard reading succeeded but organizing results failed. */
export const PARSING_FAILED_USER_MESSAGE =
	"We couldn't organize results from this document using our standard reader."

/** Shown when AI reprocess also fails. */
export const AI_REPROCESS_FAILED_USER_MESSAGE =
	"We still couldn't understand this document."

export function reportFailedAtOcrStage(report: UploadedHealthReport): boolean {
	if (reportHasExtractedText(report)) {
		return false
	}

	return report.status === 'failed' || report.status === 'uploaded'
}

export function reportEligibleForAiReprocess(
	report: UploadedHealthReport,
): boolean {
	if (reportHasExtractedText(report)) {
		return true
	}

	if (!report.storage_path?.trim()) {
		return false
	}

	return (
		report.status === 'failed' ||
		reportNeedsReprocess(report) ||
		reportFailedAtOcrStage(report)
	)
}

export function getHealthReportFailureMessage(
	report: UploadedHealthReport,
): string {
	if (reportFailedAtOcrStage(report)) {
		return OCR_FAILED_USER_MESSAGE
	}

	if (report.status === 'failed' && reportHasExtractedText(report)) {
		return PARSING_FAILED_USER_MESSAGE
	}

	if (report.status === 'failed') {
		return OCR_FAILED_USER_MESSAGE
	}

	return report.processing_error ?? 'This document needs your attention.'
}

export function toAiReprocessUserFacingError(error: unknown): string {
	if (error instanceof ExtractMetricsAiInvokeError) {
		const message = error.message.trim()

		if (message.includes('authentication failed')) {
			return message
		}

		if (/billing|credits|depleted/i.test(message)) {
			return message
		}

		if (
			/no usable laboratory metrics|invalid JSON|unexpected JSON/i.test(message)
		) {
			return message
		}
	}

	if (error instanceof Error) {
		const message = error.message.trim()

		if (
			message === OCR_FAILED_USER_MESSAGE ||
			message === AI_REPROCESS_FAILED_USER_MESSAGE ||
			message === PARSING_FAILED_USER_MESSAGE
		) {
			return message
		}

		if (
			/no usable laboratory metrics|invalid JSON|unexpected JSON/i.test(message)
		) {
			return message
		}
	}

	return AI_REPROCESS_FAILED_USER_MESSAGE
}

const AI_METRIC_CONFIDENCE = 0.55
const MAX_AI_METRICS = 100

const VALID_STATUSES = new Set<MetricStatus>([
	'normal',
	'high',
	'low',
	'borderline',
	'critical',
	'unknown',
])

export function validateAiExtractedMetrics(
	metrics: ExtractMetricsAiEdgeMetric[],
): ExtractMetricsAiEdgeMetric[] {
	const valid = metrics
		.map((metric) => {
			const rawName =
				typeof metric.rawName === 'string' ? metric.rawName.trim() : ''
			const rawValue = (metric as { value?: string | number }).value
			const value =
				typeof rawValue === 'string'
					? rawValue.trim()
					: typeof rawValue === 'number' && Number.isFinite(rawValue)
						? String(rawValue)
						: ''

			if (!rawName || !value) {
				return null
			}

			return {
				...metric,
				rawName,
				value,
			}
		})
		.filter((metric): metric is ExtractMetricsAiEdgeMetric => metric != null)
		.slice(0, MAX_AI_METRICS)

	if (valid.length === 0) {
		throw new Error(
			'AI extraction returned no usable laboratory metrics. Try deterministic reprocess or a clearer PDF.',
		)
	}

	return valid
}

export function resolveAiExtractedMetrics(input: {
	metrics: ExtractMetricsAiEdgeMetric[]
	report: UploadedHealthReport
}): ExtractMetricsAiEdgeMetric[] {
	if (input.metrics.length > 0) {
		return validateAiExtractedMetrics(input.metrics)
	}

	const existing = getParsedHealthReport(input.report)

	if (
		healthReportQualifiesForMetriclessCompletion({
			metadata: {
				reportType: existing?.metadata.reportType,
				laboratory: existing?.metadata.laboratory,
			},
			fileName: input.report.file_name,
		})
	) {
		return []
	}

	return validateAiExtractedMetrics(input.metrics)
}

function normalizeAiStatus(status: string): MetricStatus {
	return VALID_STATUSES.has(status as MetricStatus)
		? (status as MetricStatus)
		: 'unknown'
}

function toHealthMetric(
	metric: ExtractMetricsAiEdgeMetric,
	index: number,
): HealthMetric {
	const normalized = normalizeMetricName(metric.rawName)
	const referenceRange = metric.referenceRange ?? {
		rawText: '',
		lowerLimit: null,
		upperLimit: null,
		unit: null,
	}

	return {
		id: `ai-metric-${index + 1}`,
		canonicalId: normalized.canonicalId ?? `raw:${metric.rawName}`,
		displayName: metric.displayName?.trim() || normalized.displayName,
		rawName: metric.rawName.trim(),
		value: metric.value.trim(),
		numericValue: parseNumeric(metric.value),
		unit: metric.unit?.trim() || null,
		referenceRange: {
			rawText: referenceRange.rawText ?? '',
			lowerLimit:
				typeof referenceRange.lowerLimit === 'number'
					? referenceRange.lowerLimit
					: null,
			upperLimit:
				typeof referenceRange.upperLimit === 'number'
					? referenceRange.upperLimit
					: null,
			unit: referenceRange.unit ?? metric.unit ?? null,
		},
		status: normalizeAiStatus(metric.status),
		confidence: AI_METRIC_CONFIDENCE,
	}
}

function parseNumeric(value: string): number | null {
	const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)

	if (!match) {
		return null
	}

	const parsed = Number.parseFloat(match[0])
	return Number.isFinite(parsed) ? parsed : null
}

export async function buildHealthReportFromAiExtraction(input: {
	report: UploadedHealthReport
}): Promise<HealthReport> {
	const extractedText = input.report.extracted_text?.trim()

	if (!extractedText) {
		throw new Error(
			'This report has no stored OCR text. Run a standard import first.',
		)
	}

	const existing = getParsedHealthReport(input.report)
	const aiResult = await invokeExtractMetricsAiEdgeFunction({
		extractedText,
		fileName: input.report.file_name,
	})

	const validatedMetrics = resolveAiExtractedMetrics({
		metrics: aiResult.metrics,
		report: input.report,
	})
	const metrics = validatedMetrics.map(toHealthMetric)
	const metadata = {
		reportType:
			aiResult.metadata.reportType ??
			existing?.metadata.reportType ??
			'general',
		laboratory:
			aiResult.metadata.laboratory ?? existing?.metadata.laboratory ?? '',
		reportDate:
			aiResult.metadata.reportDate ??
			existing?.metadata.reportDate ??
			input.report.report_date,
		collectionDate: existing?.metadata.collectionDate ?? null,
		referenceNumber: existing?.metadata.referenceNumber ?? null,
		patientName:
			aiResult.metadata.patientName ?? existing?.metadata.patientName ?? null,
		doctorName: existing?.metadata.doctorName ?? null,
		testNames: metrics.map((metric) => metric.displayName),
		sourceDocumentId: input.report.id,
		parserVersion: 'ai-text-v1',
		ocrConfidence:
			input.report.ocr_confidence ?? existing?.metadata.ocrConfidence ?? 0,
		pageCount: input.report.ocr_page_count ?? existing?.metadata.pageCount ?? 0,
		ocrProvider:
			input.report.ocr_provider ?? existing?.metadata.ocrProvider ?? '',
		ocrProcessingTimeMs:
			input.report.ocr_processing_time_ms ??
			existing?.metadata.ocrProcessingTimeMs ??
			0,
	}

	return {
		id: input.report.id,
		documentId: input.report.id,
		metadata,
		metrics,
		metricResults: metrics.map((metric) => ({
			rawName: metric.rawName,
			canonicalId: metric.canonicalId,
			displayName: metric.displayName,
			value: metric.value,
			numericValue: metric.numericValue,
			unit: metric.unit,
			referenceRange: metric.referenceRange,
			status: metric.status,
			confidence: metric.confidence,
			source: 'text' as const,
		})),
		extractedText,
		createdAt: input.report.processed_at ?? new Date().toISOString(),
		debug: {
			ocrProvider: metadata.ocrProvider,
			ocrProcessingTimeMs: metadata.ocrProcessingTimeMs,
			ocrConfidence: metadata.ocrConfidence,
			pageCount: metadata.pageCount,
			tableCount: 0,
			parsedFields: {},
			normalizationMap: metrics.map((metric) => ({
				raw: metric.rawName,
				canonical: metric.displayName,
			})),
			extractedMetricCount: metrics.length,
			warnings: [
				'Metrics extracted with AI from stored OCR text — verify before clinical use.',
				...aiResult.warnings,
			],
			extractionMethod: 'llm',
			validationStatus: 'partial',
		},
	}
}

export const AI_REPROCESS_CONFIRMATION =
	'Reprocess with AI uses an alternative reader to extract results from this document. Verify results before relying on them.\n\nContinue?'

export const AI_BULK_REPROCESS_CONFIRMATION = (count: number) =>
	`Reprocess ${count} document${count === 1 ? '' : 's'} with AI? Results may need verification.\n\nContinue?`
