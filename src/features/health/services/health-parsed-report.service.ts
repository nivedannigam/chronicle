import {
	formatDoctorNameDisplay,
	formatLaboratoryDisplayName,
	formatPatientNameDisplay,
	formatReferenceNumberDisplay,
	identifyReportType,
	resolveReportDateFromFileName,
} from '@/features/health/extraction/health-metadata.parser'
import type { HealthReport as DomainHealthReport } from '@/features/document-intelligence/domain/health-report.domain'
import type {
	HealthMetric,
	MetricResult,
} from '@/features/document-intelligence/domain/metric.types'
import type { UploadedHealthReport } from '@/features/health/types'

const REPORT_TYPE_LABELS: Record<string, string> = {
	general: 'Health Checkup',
	iron: 'Iron Studies',
	'blood-count': 'Blood Count',
	electrolytes: 'Serum Electrolytes',
	ecg: 'ECG',
	'health-summary': 'Health Summary',
	heart: 'Lipids',
	vitamin: 'Vitamin Panel',
}

function cleanFileNameTitle(fileName: string): string {
	return fileName
		.replace(/\.pdf$/i, '')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

export function serializeParsedHealthReport(
	report: DomainHealthReport,
): Record<string, unknown> {
	return JSON.parse(JSON.stringify(report)) as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeReferenceRange(
	value: unknown,
): HealthMetric['referenceRange'] {
	if (!isRecord(value)) {
		return {
			lowerLimit: null,
			upperLimit: null,
			unit: null,
			rawText: '',
		}
	}

	return {
		lowerLimit: typeof value.lowerLimit === 'number' ? value.lowerLimit : null,
		upperLimit: typeof value.upperLimit === 'number' ? value.upperLimit : null,
		unit: typeof value.unit === 'string' ? value.unit : null,
		rawText: typeof value.rawText === 'string' ? value.rawText : '',
	}
}

function metricFromResult(result: MetricResult, index: number): HealthMetric {
	return {
		id: `metric-${index}`,
		canonicalId: result.canonicalId ?? `raw:${result.rawName}`,
		displayName: result.displayName,
		rawName: result.rawName,
		value: result.value,
		numericValue: result.numericValue,
		unit: result.unit,
		referenceRange: result.referenceRange,
		status: result.status,
		confidence: result.confidence,
	}
}

function normalizeMetrics(raw: Record<string, unknown>): HealthMetric[] {
	if (Array.isArray(raw.metrics) && raw.metrics.length > 0) {
		return raw.metrics.filter(isRecord).map((metric, index) => ({
			id: typeof metric.id === 'string' ? metric.id : `metric-${index}`,
			canonicalId:
				typeof metric.canonicalId === 'string'
					? metric.canonicalId
					: `raw:${typeof metric.rawName === 'string' ? metric.rawName : 'unknown'}`,
			displayName:
				typeof metric.displayName === 'string'
					? metric.displayName
					: typeof metric.rawName === 'string'
						? metric.rawName
						: 'Unknown metric',
			rawName:
				typeof metric.rawName === 'string'
					? metric.rawName
					: typeof metric.displayName === 'string'
						? metric.displayName
						: 'Unknown metric',
			value: typeof metric.value === 'string' ? metric.value : '—',
			numericValue:
				typeof metric.numericValue === 'number' ? metric.numericValue : null,
			unit: typeof metric.unit === 'string' ? metric.unit : null,
			referenceRange: normalizeReferenceRange(metric.referenceRange),
			status:
				typeof metric.status === 'string'
					? (metric.status as HealthMetric['status'])
					: 'unknown',
			confidence:
				typeof metric.confidence === 'number' ? metric.confidence : 0.5,
		}))
	}

	if (Array.isArray(raw.metricResults) && raw.metricResults.length > 0) {
		return (raw.metricResults as MetricResult[]).map(metricFromResult)
	}

	return []
}

function normalizeMetadata(
	raw: Record<string, unknown>,
): DomainHealthReport['metadata'] {
	const metadata = isRecord(raw.metadata) ? raw.metadata : {}

	return {
		reportType:
			typeof metadata.reportType === 'string' ? metadata.reportType : 'general',
		laboratory: formatLaboratoryDisplayName(
			typeof metadata.laboratory === 'string' ? metadata.laboratory : null,
		),
		reportDate:
			typeof metadata.reportDate === 'string' ? metadata.reportDate : null,
		collectionDate:
			typeof metadata.collectionDate === 'string'
				? metadata.collectionDate
				: null,
		referenceNumber: formatReferenceNumberDisplay(
			typeof metadata.referenceNumber === 'string'
				? metadata.referenceNumber
				: null,
		),
		patientName: formatPatientNameDisplay(
			typeof metadata.patientName === 'string' ? metadata.patientName : null,
		),
		doctorName: formatDoctorNameDisplay(
			typeof metadata.doctorName === 'string' ? metadata.doctorName : null,
		),
		testNames: Array.isArray(metadata.testNames)
			? metadata.testNames.filter(
					(item): item is string => typeof item === 'string',
				)
			: [],
		sourceDocumentId:
			typeof metadata.sourceDocumentId === 'string'
				? metadata.sourceDocumentId
				: typeof raw.documentId === 'string'
					? raw.documentId
					: '',
		parserVersion:
			typeof metadata.parserVersion === 'string'
				? metadata.parserVersion
				: 'unknown',
		ocrConfidence:
			typeof metadata.ocrConfidence === 'number' ? metadata.ocrConfidence : 0,
		pageCount: typeof metadata.pageCount === 'number' ? metadata.pageCount : 0,
		ocrProvider:
			typeof metadata.ocrProvider === 'string'
				? metadata.ocrProvider
				: 'unknown',
		ocrProcessingTimeMs:
			typeof metadata.ocrProcessingTimeMs === 'number'
				? metadata.ocrProcessingTimeMs
				: 0,
	}
}

export function parseStoredHealthReport(
	data: unknown,
): DomainHealthReport | null {
	if (!isRecord(data)) {
		return null
	}

	const metrics = normalizeMetrics(data)

	if (metrics.length === 0 && !isRecord(data.metadata)) {
		return null
	}

	return {
		id: typeof data.id === 'string' ? data.id : '',
		documentId:
			typeof data.documentId === 'string'
				? data.documentId
				: typeof data.id === 'string'
					? data.id
					: '',
		metadata: normalizeMetadata(data),
		metrics,
		metricResults: Array.isArray(data.metricResults)
			? (data.metricResults as MetricResult[])
			: [],
		extractedText:
			typeof data.extractedText === 'string' ? data.extractedText : '',
		createdAt:
			typeof data.createdAt === 'string'
				? data.createdAt
				: new Date().toISOString(),
		debug: isRecord(data.debug)
			? (data.debug as unknown as DomainHealthReport['debug'])
			: undefined,
	}
}

export function getParsedHealthReport(
	uploadedReport: UploadedHealthReport,
): DomainHealthReport | null {
	return parseStoredHealthReport(uploadedReport.parsed_data)
}

export function formatReportTypeLabel(reportType: string): string {
	if (REPORT_TYPE_LABELS[reportType]) {
		return REPORT_TYPE_LABELS[reportType]
	}

	return reportType
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

export function inferReportTypeFromFileName(fileName: string): string | null {
	const type = identifyReportType('', fileName)

	if (
		type === 'general' &&
		!/\b(checkup|summary|iron|body)\b/i.test(fileName)
	) {
		return null
	}

	return type
}

function shouldPreferFileNameTitle(fileName: string): boolean {
	const cleaned = cleanFileNameTitle(fileName)

	return /\b(iron test|iron studies|ferritin|cea test|carcino|vitamin d|vitamin b)\b/i.test(
		cleaned,
	)
}

export function getReportDisplayTitle(report: UploadedHealthReport): string {
	const parsed = getParsedHealthReport(report)
	const reportType = parsed?.metadata.reportType ?? report.report_type ?? null
	const cleanedFileName = cleanFileNameTitle(report.file_name)

	if (shouldPreferFileNameTitle(report.file_name)) {
		return cleanedFileName
	}

	if (reportType && reportType !== 'general') {
		return `${formatReportTypeLabel(reportType)} Report`
	}

	const inferred = inferReportTypeFromFileName(report.file_name)

	if (inferred && inferred !== 'general') {
		return `${formatReportTypeLabel(inferred)} Report`
	}

	const cleaned = cleanFileNameTitle(report.file_name)

	if (cleaned.length > 0 && !/^report$/i.test(cleaned)) {
		return cleaned
	}

	return 'Medical Report'
}

export function getReportDisplayDate(
	report: UploadedHealthReport,
	parsed: DomainHealthReport | null = getParsedHealthReport(report),
): string {
	return (
		parsed?.metadata.reportDate ??
		parsed?.metadata.collectionDate ??
		report.report_date ??
		resolveReportDateFromFileName(report.file_name) ??
		report.uploaded_at.slice(0, 10)
	)
}

export function hasLegacyApproximateOcr(report: UploadedHealthReport): boolean {
	if (report.processing_error?.includes('Mock OCR')) {
		return true
	}

	const metadata = report.ocr_metadata as
		Record<string, unknown> | null | undefined

	if (metadata?.usedMockFallback === true) {
		return true
	}

	if (report.ocr_provider === 'mock') {
		return true
	}

	return false
}

export function needsOcrReprocess(report: UploadedHealthReport): boolean {
	return hasLegacyApproximateOcr(report)
}

export function countLegacyApproximateOcrReports(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(
		(report) =>
			report.status === 'completed' && hasLegacyApproximateOcr(report),
	).length
}

export function formatMetricDisplayValue(value: string): string {
	const trimmed = value.trim().replace(/^:\s*/, '')

	return trimmed.length > 0 ? trimmed : value
}
