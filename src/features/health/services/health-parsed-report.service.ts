import { identifyReportType } from '@/features/document-intelligence/extraction/health-metadata.parser'
import type { HealthReport as DomainHealthReport } from '@/features/document-intelligence/domain/health-report.domain'
import type { UploadedHealthReport } from '@/features/health/types'

const REPORT_TYPE_LABELS: Record<string, string> = {
	general: 'Health Checkup',
	'blood-count': 'Blood Count',
	heart: 'Lipids',
}

export function serializeParsedHealthReport(
	report: DomainHealthReport,
): Record<string, unknown> {
	return JSON.parse(JSON.stringify(report)) as Record<string, unknown>
}

export function parseStoredHealthReport(
	data: unknown,
): DomainHealthReport | null {
	if (!data || typeof data !== 'object') {
		return null
	}

	return data as DomainHealthReport
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

	return type === 'general' &&
		!/\b(checkup|summary|iron|body)\b/i.test(fileName)
		? null
		: type
}

export function getReportDisplayTitle(report: UploadedHealthReport): string {
	const parsed = getParsedHealthReport(report)

	if (parsed?.metadata.reportType) {
		return `${formatReportTypeLabel(parsed.metadata.reportType)} Report`
	}

	if (report.report_type && report.report_type !== 'general') {
		return `${formatReportTypeLabel(report.report_type)} Report`
	}

	const inferred = inferReportTypeFromFileName(report.file_name)

	if (inferred) {
		return `${formatReportTypeLabel(inferred)} Report`
	}

	return report.file_name
}

export function getReportDisplayDate(
	report: UploadedHealthReport,
	parsed: DomainHealthReport | null = getParsedHealthReport(report),
): string {
	return (
		parsed?.metadata.reportDate ??
		report.report_date ??
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
