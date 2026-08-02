import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import {
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type {
	ClassifiedReport,
	ReportTimelineKind,
} from '@/features/health-intelligence/types/health-profile.types'

const KIND_LABELS: Record<ReportTimelineKind, string> = {
	annual_checkup: 'Annual Checkup',
	blood_test: 'Blood Test',
	ecg: 'ECG',
	radiology: 'Radiology Scan',
	vitamin_test: 'Vitamin Test',
	health_summary: 'Health Summary',
	specialist_visit: 'Specialist Visit',
	general: 'Medical Report',
}

function classifyFromText(text: string): ReportTimelineKind {
	const normalized = text.toLowerCase()

	if (
		normalized.includes('ecg') ||
		normalized.includes('electrocardiogram') ||
		normalized.includes('ekg')
	) {
		return 'ecg'
	}

	if (
		normalized.includes('tmt') ||
		normalized.includes('treadmill') ||
		normalized.includes('stress test') ||
		normalized.includes('company wellness') ||
		normalized.includes('wellness plan')
	) {
		return 'health_summary'
	}

	if (
		normalized.includes('mri') ||
		normalized.includes(' ct ') ||
		normalized.includes('x-ray') ||
		normalized.includes('xray') ||
		normalized.includes('ultrasound') ||
		normalized.includes('radiology') ||
		normalized.includes('scan')
	) {
		return 'radiology'
	}

	if (
		normalized.includes('vitamin d') ||
		normalized.includes('vitamin b12') ||
		normalized.includes('vitamin test')
	) {
		return 'vitamin_test'
	}

	if (
		normalized.includes('cbc') ||
		normalized.includes('lipid') ||
		normalized.includes('blood test') ||
		normalized.includes('pathology') ||
		normalized.includes('lab report') ||
		normalized.includes('hemoglobin') ||
		normalized.includes('lft') ||
		normalized.includes('kft')
	) {
		return 'blood_test'
	}

	if (
		normalized.includes('annual') ||
		normalized.includes('master health') ||
		normalized.includes('full body') ||
		normalized.includes('executive health')
	) {
		return 'annual_checkup'
	}

	if (
		normalized.includes('summary') ||
		normalized.includes('discharge') ||
		normalized.includes('health report')
	) {
		return 'health_summary'
	}

	if (
		normalized.includes('cardio') ||
		normalized.includes('dermat') ||
		normalized.includes('consult')
	) {
		return 'specialist_visit'
	}

	return 'general'
}

export function classifyReportType(
	report: UploadedHealthReport,
): ClassifiedReport {
	const parsed = getParsedHealthReport(report)
	const title = getReportDisplayTitle(report)
	const date = getReportDisplayDate(report, parsed)
	const searchable = [
		title,
		report.file_name,
		parsed?.metadata.reportType ?? '',
		report.report_type ?? '',
		parsed?.metadata.laboratory ?? '',
		...(parsed?.metrics.map((m) => m.displayName) ?? []),
	].join(' ')

	const fromMetadata = parsed?.metadata.reportType
		? classifyFromText(parsed.metadata.reportType)
		: 'general'
	const kind =
		fromMetadata !== 'general' ? fromMetadata : classifyFromText(searchable)

	return {
		reportId: report.id,
		title,
		kind,
		displayKind: KIND_LABELS[kind],
		hospital: parsed?.metadata.laboratory ?? null,
		doctor: parsed?.metadata.doctorName ?? null,
		date,
	}
}

export function timelineSummaryForReport(classified: ClassifiedReport): string {
	const parts = [classified.displayKind]

	if (classified.hospital) {
		parts.push(`at ${classified.hospital}`)
	}

	if (classified.doctor) {
		parts.push(`with ${classified.doctor}`)
	}

	return parts.join(' ')
}

export { KIND_LABELS as REPORT_KIND_LABELS }
