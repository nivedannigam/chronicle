import type { OcrDocumentResult } from '@/features/document-intelligence/ocr'
import type { ReportMetadata } from '@/features/health/domain/health-report.domain'

const LAB_PATTERN = /(?:Laboratory|Lab(?: Name)?)\s*[:.-]?\s*(.+)/i
const PATIENT_PATTERN = /(?:Patient(?: Name)?)\s*[:.-]?\s*(.+)/i
const DOCTOR_PATTERN = /(?:Doctor|Ref(?:erred)? By|Consultant)\s*[:.-]?\s*(.+)/i
const REPORT_DATE_PATTERN =
	/(?:Report Date|Date of Report|Report Released on \(RRT\))\s*[:.-]?\s*(\d{2}[-/][A-Za-z]{3}[-/]\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\s+[A-Za-z]{3}\s+\d{4}(?:\s+\d{2}:\d{2})?)/i
const THYROCARE_RRT_DATE_PATTERN =
	/Report Released on \(RRT\)[\s\S]{0,400}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})/i
const COLLECTION_DATE_PATTERN =
	/(?:Collection Date|Sample Date|Collected On|Sample Collected on \(SCT\))\s*[:.-]?\s*(\d{2}[-/][A-Za-z]{3}[-/]\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\s+[A-Za-z]{3}\s+\d{4}(?:\s+\d{2}:\d{2})?)/i
const REFERENCE_NUMBER_PATTERN =
	/(?:Reference(?: No|Number)?|Accession(?: No|Number)?|Lab ID)\s*[:.-]?\s*([A-Za-z0-9-]+)/i

const FILENAME_TYPE_RULES: Array<{ pattern: RegExp; type: string }> = [
	{
		pattern: /complete blood|blood count|\bcbc\b|blood test|full blood/i,
		type: 'blood-count',
	},
	{ pattern: /\biron\b|ferritin|tibc/i, type: 'vitamin' },
	{
		pattern: /full body|partial checkup|health summary|\bcheckup\b/i,
		type: 'general',
	},
	{ pattern: /liver function|\blft\b|\bliver\b/i, type: 'liver' },
	{ pattern: /kidney function|\bkft\b|\brenal\b|\bkidney\b/i, type: 'kidney' },
	{
		pattern: /lipid profile|lipid panel|cholesterol panel|\blipid\b/i,
		type: 'heart',
	},
	{ pattern: /thyroid profile|thyroid panel|\bthyroid\b/i, type: 'thyroid' },
	{ pattern: /vitamin panel|vitamin profile|\bvitamin\b/i, type: 'vitamin' },
	{ pattern: /\bhba1c\b|diabetes panel|\bdiabetes\b/i, type: 'diabetes' },
]

const HEADER_TYPE_RULES: Array<{ pattern: RegExp; type: string }> = [
	{
		pattern: /complete blood count|\bcbc\b|full blood count/i,
		type: 'blood-count',
	},
	{ pattern: /iron (studies|profile|test)|serum iron/i, type: 'vitamin' },
	{
		pattern:
			/full body checkup|partial checkup|annual health|health checkup|health summary|general checkup/i,
		type: 'general',
	},
	{ pattern: /liver function|\blft\b/i, type: 'liver' },
	{ pattern: /kidney function|\bkft\b|\brenal profile\b/i, type: 'kidney' },
	{ pattern: /lipid profile|lipid panel|cholesterol panel/i, type: 'heart' },
	{ pattern: /thyroid profile|thyroid panel/i, type: 'thyroid' },
	{ pattern: /vitamin panel|vitamin profile/i, type: 'vitamin' },
	{ pattern: /diabetes panel|\bhba1c\b/i, type: 'diabetes' },
]

const MONTHS: Record<string, string> = {
	Jan: '01',
	Feb: '02',
	Mar: '03',
	Apr: '04',
	May: '05',
	Jun: '06',
	Jul: '07',
	Aug: '08',
	Sep: '09',
	Oct: '10',
	Nov: '11',
	Dec: '12',
}

function parseDate(rawDate: string | null): string | null {
	if (!rawDate) {
		return null
	}

	const ddMmmYyyy = rawDate.match(/^(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/)

	if (ddMmmYyyy) {
		const [, day, month, year] = ddMmmYyyy
		const monthNumber = MONTHS[month]

		if (monthNumber) {
			return `${year}-${monthNumber}-${day}`
		}
	}

	const normalized = rawDate.replace(/\//g, '-')
	const parsed = new Date(normalized.replace(/-/g, ' '))

	if (Number.isNaN(parsed.getTime())) {
		return null
	}

	return parsed.toISOString().slice(0, 10)
}

function resolveLaboratory(text: string, fileName: string): string {
	if (/Clinically Tested by\s*:\s*Thyrocare/i.test(text)) {
		return 'Thyrocare Technologies Ltd'
	}

	if (
		/thyrocare|Sohrabh Hall|Aarogyam|HDFC COMBO/i.test(`${text}\n${fileName}`)
	) {
		return 'Thyrocare'
	}

	const explicit = text.match(LAB_PATTERN)?.[1]?.trim()

	if (explicit && !/^unknown$/i.test(explicit) && explicit.length < 80) {
		return explicit
	}

	return 'Unknown Laboratory'
}

function resolveReportDate(text: string): string | null {
	const headerBlock = text.slice(0, 1500)
	const thyrocareDates = headerBlock.match(
		/Processed At[\s\S]{0,500}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})[\s\S]{0,120}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})[\s\S]{0,120}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})/i,
	)

	if (thyrocareDates) {
		return parseDate(thyrocareDates[3])
	}

	return (
		parseDate(text.match(REPORT_DATE_PATTERN)?.[1] ?? null) ??
		parseDate(text.match(THYROCARE_RRT_DATE_PATTERN)?.[1] ?? null)
	)
}

/** Document header only — stops before metric table rows. */
export function extractDocumentHeader(text: string): string {
	const headerLines: string[] = []

	for (const line of text.split('\n')) {
		const trimmed = line.trim()

		if (!trimmed) {
			if (headerLines.length > 0) {
				break
			}

			continue
		}

		if (/^test name\b/i.test(trimmed)) {
			break
		}

		if (/result\s+reference range/i.test(trimmed)) {
			break
		}

		if (
			headerLines.length >= 3 &&
			/\s{2,}\S+/.test(trimmed) &&
			!/[:.]/.test(trimmed)
		) {
			break
		}

		headerLines.push(trimmed)

		if (headerLines.length >= 8) {
			break
		}
	}

	return headerLines.join('\n')
}

export function identifyReportType(text: string, fileName: string): string {
	const fileHaystack = fileName.toLowerCase()

	for (const rule of FILENAME_TYPE_RULES) {
		if (rule.pattern.test(fileHaystack)) {
			return rule.type
		}
	}

	const headerHaystack = extractDocumentHeader(text).toLowerCase()

	for (const rule of HEADER_TYPE_RULES) {
		if (rule.pattern.test(headerHaystack)) {
			return rule.type
		}
	}

	return 'general'
}

export type ParsedReportMetadata = Pick<
	ReportMetadata,
	| 'reportType'
	| 'laboratory'
	| 'reportDate'
	| 'collectionDate'
	| 'referenceNumber'
	| 'patientName'
	| 'doctorName'
>

export function parseReportMetadata(
	ocrDocument: OcrDocumentResult,
	fileName: string,
): ParsedReportMetadata {
	const text = ocrDocument.rawText

	return {
		reportType: identifyReportType(text, fileName),
		laboratory: resolveLaboratory(text, fileName),
		reportDate: resolveReportDate(text),
		collectionDate: parseDate(text.match(COLLECTION_DATE_PATTERN)?.[1] ?? null),
		referenceNumber: text.match(REFERENCE_NUMBER_PATTERN)?.[1]?.trim() ?? null,
		patientName: text.match(PATIENT_PATTERN)?.[1]?.trim() ?? null,
		doctorName: text.match(DOCTOR_PATTERN)?.[1]?.trim() ?? null,
	}
}
