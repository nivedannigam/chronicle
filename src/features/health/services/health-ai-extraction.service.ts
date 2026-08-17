import type { HealthReport } from '@/features/document-intelligence/domain/health-report.domain'
import type {
	HealthMetric,
	MetricStatus,
} from '@/features/document-intelligence/domain/metric.types'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'
import { mergeExtractedHealthMetrics } from '@/features/health/services/merge-extracted-metrics.service'
import {
	isSuspiciousPartialExtraction,
	shouldSkipAiMetricExtraction,
} from '@/features/health/services/health-partial-extraction.service'
import {
	invokeExtractMetricsAiEdgeFunction,
	invokeExtractMetricsAiDirectFromDocument,
	type ExtractMetricsAiEdgeMetric,
	ExtractMetricsAiInvokeError,
} from '@/shared/ai/transport/extract-metrics-ai-edge.client'
import { isAskAiEdgeConfigured } from '@/shared/ai/transport/ask-ai-edge.client'
import type { UploadedHealthReport } from '@/features/health/types'
import { USER_VOCAB } from '@/constants/user-vocabulary'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import {
	healthReportQualifiesForMetriclessCompletion,
	reportHasExtractedText,
	reportNeedsReprocess,
} from '@/features/health/services/report-readiness.service'

/** Shown when reading failed before any text was stored. */
export const OCR_FAILED_USER_MESSAGE = "We couldn't read this document yet."

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

	return USER_VOCAB.messages.couldNotUnderstand
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
	layoutReport?: HealthReport
}): Promise<HealthReport> {
	const extractedText = input.report.extracted_text?.trim()

	if (!extractedText) {
		throw new Error(
			'This report has no stored OCR text. Run a standard import first.',
		)
	}

	const existing = getParsedHealthReport(input.report)
	const layoutMetrics = input.layoutReport?.metrics ?? []
	const aiResult = await invokeExtractMetricsAiEdgeFunction({
		extractedText,
		fileName: input.report.file_name,
	})

	const validatedMetrics = resolveAiExtractedMetrics({
		metrics: aiResult.metrics,
		report: input.report,
	})
	const aiHealthMetrics = validatedMetrics.map(toHealthMetric)
	const metrics = mergeExtractedHealthMetrics({
		layoutMetrics,
		aiMetrics: aiHealthMetrics,
	})

	if (
		metrics.length > 0 &&
		isSuspiciousPartialExtraction({
			fileName: input.report.file_name,
			metrics,
		})
	) {
		throw new Error(
			'Chronicle could not read a complete panel from this checkup. Try Advanced Reading again or upload a clearer PDF.',
		)
	}

	const extractionMethod =
		layoutMetrics.length > 0 && aiHealthMetrics.length > 0
			? 'layout+llm'
			: aiHealthMetrics.length > 0
				? 'llm'
				: 'deterministic'

	const layoutMetadata = input.layoutReport?.metadata
	const metadata = {
		reportType:
			aiResult.metadata.reportType ??
			layoutMetadata?.reportType ??
			existing?.metadata.reportType ??
			'general',
		laboratory:
			aiResult.metadata.laboratory ??
			layoutMetadata?.laboratory ??
			existing?.metadata.laboratory ??
			'',
		reportDate:
			aiResult.metadata.reportDate ??
			layoutMetadata?.reportDate ??
			existing?.metadata.reportDate ??
			input.report.report_date,
		collectionDate:
			layoutMetadata?.collectionDate ??
			existing?.metadata.collectionDate ??
			null,
		referenceNumber:
			layoutMetadata?.referenceNumber ??
			existing?.metadata.referenceNumber ??
			null,
		patientName:
			aiResult.metadata.patientName ??
			layoutMetadata?.patientName ??
			existing?.metadata.patientName ??
			null,
		doctorName:
			layoutMetadata?.doctorName ?? existing?.metadata.doctorName ?? null,
		testNames: metrics.map((metric) => metric.displayName),
		sourceDocumentId: input.report.id,
		parserVersion:
			extractionMethod === 'layout+llm'
				? 'layout+ai-text-v1'
				: extractionMethod === 'llm'
					? 'ai-text-v1'
					: (layoutMetadata?.parserVersion ?? 'metric-extraction'),
		ocrConfidence:
			input.report.ocr_confidence ??
			layoutMetadata?.ocrConfidence ??
			existing?.metadata.ocrConfidence ??
			0,
		pageCount:
			input.report.ocr_page_count ??
			layoutMetadata?.pageCount ??
			existing?.metadata.pageCount ??
			0,
		ocrProvider:
			input.report.ocr_provider ??
			layoutMetadata?.ocrProvider ??
			existing?.metadata.ocrProvider ??
			'',
		ocrProcessingTimeMs:
			input.report.ocr_processing_time_ms ??
			layoutMetadata?.ocrProcessingTimeMs ??
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
			tableCount: input.layoutReport?.debug?.tableCount ?? 0,
			parsedFields: input.layoutReport?.debug?.parsedFields ?? {},
			normalizationMap: metrics.map((metric) => ({
				raw: metric.rawName,
				canonical: metric.displayName,
			})),
			extractedMetricCount: metrics.length,
			warnings: [
				extractionMethod === 'layout+llm'
					? 'Metrics merged from layout parser and AI reading.'
					: 'Metrics extracted with AI from stored OCR text — verify before clinical use.',
				...aiResult.warnings,
				...(input.layoutReport?.debug?.warnings ?? []),
			],
			extractionMethod,
			validationStatus:
				extractionMethod === 'layout+llm' || metrics.length >= 15
					? 'complete'
					: 'partial',
		},
	}
}

/** AI-by-default path after OCR: merge layout parser output with chunked AI extraction. */
export async function buildHealthReportWithAiDefaultExtraction(input: {
	report: UploadedHealthReport
	layoutReport: HealthReport
}): Promise<HealthReport> {
	if (
		shouldSkipAiMetricExtraction({
			fileName: input.report.file_name,
			metadata: input.layoutReport.metadata,
		})
	) {
		return {
			...input.layoutReport,
			debug: {
				...input.layoutReport.debug,
				ocrProvider:
					input.layoutReport.debug?.ocrProvider ??
					input.layoutReport.metadata.ocrProvider,
				ocrProcessingTimeMs:
					input.layoutReport.debug?.ocrProcessingTimeMs ??
					input.layoutReport.metadata.ocrProcessingTimeMs,
				ocrConfidence:
					input.layoutReport.debug?.ocrConfidence ??
					input.layoutReport.metadata.ocrConfidence,
				pageCount:
					input.layoutReport.debug?.pageCount ??
					input.layoutReport.metadata.pageCount,
				tableCount: input.layoutReport.debug?.tableCount ?? 0,
				parsedFields: input.layoutReport.debug?.parsedFields ?? {},
				normalizationMap: input.layoutReport.debug?.normalizationMap ?? [],
				extractedMetricCount: input.layoutReport.metrics.length,
				warnings: input.layoutReport.debug?.warnings ?? [],
				extractionMethod: 'deterministic',
				validationStatus: 'complete',
			},
		}
	}

	return buildHealthReportFromAiExtraction({
		report: input.report,
		layoutReport: input.layoutReport,
	})
}

export function isHealthAiDirectExtractionSufficient(input: {
	healthReport: HealthReport
	fileName: string
}): boolean {
	if (input.healthReport.metrics.length > 0) {
		return true
	}

	return healthReportQualifiesForMetriclessCompletion({
		metadata: input.healthReport.metadata,
		fileName: input.fileName,
	})
}

export async function buildHealthReportFromAiDirectExtraction(input: {
	report: UploadedHealthReport
}): Promise<HealthReport | null> {
	if (!input.report.storage_path?.trim() || !isAskAiEdgeConfigured()) {
		return null
	}

	if (
		shouldSkipAiMetricExtraction({
			fileName: input.report.file_name,
			metadata: {},
		})
	) {
		return null
	}

	try {
		const aiResult = await invokeExtractMetricsAiDirectFromDocument({
			fileName: input.report.file_name,
			storagePath: input.report.storage_path,
			bucket: 'health-reports',
		})
		const validatedMetrics = resolveAiExtractedMetrics({
			metrics: aiResult.metrics,
			report: input.report,
		})
		const aiHealthMetrics = validatedMetrics.map(toHealthMetric)
		const existing = getParsedHealthReport(input.report)

		if (
			aiHealthMetrics.length > 0 &&
			isSuspiciousPartialExtraction({
				fileName: input.report.file_name,
				metrics: aiHealthMetrics,
			})
		) {
			return null
		}

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
			testNames: aiHealthMetrics.map((metric) => metric.displayName),
			sourceDocumentId: input.report.id,
			parserVersion: 'ai-direct-v1',
			ocrConfidence: 0,
			pageCount: 0,
			ocrProvider: '',
			ocrProcessingTimeMs: 0,
		}

		const healthReport: HealthReport = {
			id: input.report.id,
			documentId: input.report.id,
			metadata,
			metrics: aiHealthMetrics,
			metricResults: aiHealthMetrics.map((metric) => ({
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
			extractedText: '',
			createdAt: input.report.processed_at ?? new Date().toISOString(),
			debug: {
				ocrProvider: '',
				ocrProcessingTimeMs: 0,
				ocrConfidence: 0,
				pageCount: 0,
				tableCount: 0,
				parsedFields: {},
				normalizationMap: aiHealthMetrics.map((metric) => ({
					raw: metric.rawName,
					canonical: metric.displayName,
				})),
				extractedMetricCount: aiHealthMetrics.length,
				warnings: [
					'Metrics extracted with AI direct document reading — verify before clinical use.',
					...aiResult.warnings,
				],
				extractionMethod: 'llm',
				validationStatus: aiHealthMetrics.length >= 15 ? 'complete' : 'partial',
			},
		}

		return isHealthAiDirectExtractionSufficient({
			healthReport,
			fileName: input.report.file_name,
		})
			? healthReport
			: null
	} catch {
		return null
	}
}

export const AI_REPROCESS_CONFIRMATION =
	USER_VOCAB.messages.advancedReadingConfirm

export const AI_BULK_REPROCESS_CONFIRMATION = (count: number) =>
	`Reprocess ${count} document${count === 1 ? '' : 's'} with AI? Results may need verification.\n\nContinue?`
