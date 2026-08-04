import type { OcrDocumentResult } from '@/features/document-intelligence/ocr'
import type { ReportMetadata } from '@/features/health/domain/health-report.domain'

const LABORATORY_LABEL_PATTERN =
	/(?:Laboratory|Lab Name)\s*[:.-]\s*(.+?)(?:\n|$)/i
const ORGANIZATION_PATTERN =
	/Organization\s*:\s*(.+?)(?:\n|Patient|Registered|DBO|Sample|Ref\.|$)/i
const PATIENT_NAME_PATTERN =
	/Patient(?: Name)?\s*:\s*(.+?)(?=Registered on|Collected on|Reported on|Printed on|Referral|Organization|DBO\/Age|$)/i
const REFERRAL_PATTERN =
	/Referral\s*:\s*(.+?)(?=Printed on|Organization|Reported on|$)/i
const DOCTOR_SIGNATURE_PATTERN = /^Dr\.?\s+[A-Za-z][\w.\s-]+$/im
const DOCTOR_PATTERN = /(?:Doctor|Ref(?:erred)? By)\s*[:.-]\s*(.+?)(?:\n|$)/i
const REPORT_DATE_PATTERN =
	/(?:Report Date|Date of Report|Report Released on \(RRT\))\s*[:.-]?\s*(\d{2}[-/][A-Za-z]{3}[-/]\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\s+[A-Za-z]{3}\s+\d{4}(?:\s+\d{2}:\d{2})?)/i
const THYROCARE_RRT_DATE_PATTERN =
	/Report Released on \(RRT\)[\s\S]{0,400}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})/i
const COLLECTION_DATE_PATTERN =
	/(?:Collection Date|Sample Date|Collected On|Sample Collected on \(SCT\))\s*[:.-]?\s*(\d{2}[-/][A-Za-z]{3}[-/]\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\s+[A-Za-z]{3}\s+\d{4}(?:\s+\d{2}:\d{2})?)/i
const REFERENCE_NUMBER_PATTERN =
	/(?:Reference(?:\s+(?:No|Number))|Accession(?:\s+(?:No|Number))|Lab ID)\s*:\s*([A-Za-z0-9-]+)/i
const PATIENT_ID_PATTERN = /Patient ID\s*:\s*(\d+)/i

const FILENAME_TYPE_RULES: Array<{ pattern: RegExp; type: string }> = [
	{
		pattern: /complete blood|blood count|\bcbc\b|blood test|full blood/i,
		type: 'blood-count',
	},
	{
		pattern: /electrolyte|serum electrolyte|sodium|potassium|chloride/i,
		type: 'electrolytes',
	},
	{
		pattern: /\becg\b|electrocardiogram|\bekg\b|imedrix|tmt|treadmill/i,
		type: 'ecg',
	},
	{
		pattern: /health summary|wellness|company wellness/i,
		type: 'health-summary',
	},
	{ pattern: /\biron\b|ferritin|tibc|uibc/i, type: 'iron' },
	{
		pattern: /full body|partial checkup|\bcheckup\b/i,
		type: 'general',
	},
	{ pattern: /liver function|\blft\b|\bliver\b/i, type: 'liver' },
	{ pattern: /kidney function|\bkft\b|\brenal\b|\bkidney\b/i, type: 'kidney' },
	{
		pattern: /lipid profile|lipid panel|cholesterol panel|\blipid\b/i,
		type: 'heart',
	},
	{ pattern: /thyroid profile|thyroid panel|\bthyroid\b/i, type: 'thyroid' },
	{ pattern: /\bcea\b|carcino/i, type: 'general' },
	{ pattern: /vitamin panel|vitamin profile|\bvitamin\b/i, type: 'vitamin' },
	{ pattern: /\bhba1c\b|diabetes panel|\bdiabetes\b/i, type: 'diabetes' },
]

const HEADER_TYPE_RULES: Array<{ pattern: RegExp; type: string }> = [
	{
		pattern: /complete blood count|\bcbc\b|full blood count/i,
		type: 'blood-count',
	},
	{ pattern: /iron (studies|profile|test)|serum iron/i, type: 'iron' },
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

const KNOWN_LAB_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
	{ pattern: /\bQtest\b/i, name: 'Qtest' },
	{ pattern: /\bSvasth\b/i, name: 'Svasth' },
	{ pattern: /\bMetropolis\b/i, name: 'Metropolis Healthcare' },
	{ pattern: /\bSRL\b/i, name: 'SRL Diagnostics' },
	{ pattern: /S\s*&\s*D\s*Diagnostics/i, name: 'S&D Diagnostics' },
]

const IMPLAUSIBLE_LAB_PATTERN =
	/^(no|yes|unknown|technologist|pathologist|lab technologist|& diagnostics)$/i

function cleanLaboratoryCandidate(value: string): string {
	return value
		.replace(/\s+/g, ' ')
		.replace(/[|].*$/, '')
		.trim()
}

function isPlausibleLaboratoryName(value: string): boolean {
	const cleaned = cleanLaboratoryCandidate(value)

	if (cleaned.length < 3) {
		return false
	}

	if (IMPLAUSIBLE_LAB_PATTERN.test(cleaned)) {
		return false
	}

	if (/^&\s/i.test(cleaned) && !/S\s*&\s*D/i.test(cleaned)) {
		return false
	}

	if (
		/technologist|pathologist/i.test(cleaned) &&
		!/diagnostic|laboratory|\blab\b/i.test(cleaned)
	) {
		return false
	}

	return true
}

function recoverLaboratoryFromText(text: string): string | null {
	for (const { pattern, name } of KNOWN_LAB_PATTERNS) {
		if (pattern.test(text)) {
			return name
		}
	}

	if (/&\s*Diagnostics/i.test(text) && /S\s*&\s*D|S&D/i.test(text)) {
		return 'S&D Diagnostics'
	}

	return null
}

const TEMPLATE_PLACEHOLDER_PATTERN =
	/^(?:DBO\/Age\/Gender|Patient Name|NAME|N\/A|Unknown)$/i

const IMPLAUSIBLE_REFERENCE_PATTERN =
	/^(?:temperature|absent|normal|negative|positive|present|reactive|nonreactive)$/i

const IMPLAUSIBLE_DOCTOR_PATTERN =
	/^(?:MD Pathologist|Lab Technologist|Consultant MD Pathologist|Pathologist|Technologist|SELF)$/i

function cleanPersonName(value: string): string {
	return value.replace(/\s+/g, ' ').trim()
}

function isTemplatePlaceholder(value: string): boolean {
	return TEMPLATE_PLACEHOLDER_PATTERN.test(cleanPersonName(value))
}

function isPlausibleReferenceNumber(value: string): boolean {
	const cleaned = value.trim()

	if (cleaned.length < 2 || cleaned.length > 40) {
		return false
	}

	if (IMPLAUSIBLE_REFERENCE_PATTERN.test(cleaned)) {
		return false
	}

	return /^[A-Za-z0-9-]+$/.test(cleaned)
}

function normalizeDoctorCandidate(value: string): string {
	return cleanPersonName(value)
		.replace(/\s+Consultant\s+MD\s+Pathologist.*$/i, '')
		.replace(/\s+MD\s+Pathologist.*$/i, '')
		.trim()
}

function isPlausibleDoctorName(value: string): boolean {
	const cleaned = normalizeDoctorCandidate(value)

	if (cleaned.length < 3 || IMPLAUSIBLE_DOCTOR_PATTERN.test(cleaned)) {
		return false
	}

	if (/^Dr\.?\s/i.test(cleaned) || /^DR\.?\s/i.test(cleaned)) {
		return true
	}

	if (/pathologist|technologist|consultant/i.test(cleaned)) {
		return false
	}

	return /[A-Za-z]{2,}/.test(cleaned)
}

export function formatReferenceNumberDisplay(
	referenceNumber?: string | null,
): string | null {
	const raw = referenceNumber?.trim()

	if (!raw || !isPlausibleReferenceNumber(raw)) {
		return null
	}

	return raw
}

export function formatPatientNameDisplay(
	patientName?: string | null,
): string | null {
	const raw = patientName?.trim()

	if (!raw || isTemplatePlaceholder(raw)) {
		return null
	}

	if (/^DBO\/Age\/Gender/i.test(raw)) {
		return null
	}

	return cleanPersonName(raw)
}

export function formatDoctorNameDisplay(
	doctorName?: string | null,
): string | null {
	const raw = doctorName?.trim()

	if (!raw) {
		return null
	}

	const cleaned = normalizeDoctorCandidate(raw)

	if (!cleaned || !isPlausibleDoctorName(cleaned)) {
		return null
	}

	return cleaned
}

export function formatLaboratoryDisplayName(
	laboratory?: string | null,
	fallback = 'Medical center',
): string {
	const raw = laboratory?.trim()

	if (!raw || /^unknown laboratory$/i.test(raw)) {
		return fallback
	}

	if (!isPlausibleLaboratoryName(raw)) {
		return fallback
	}

	return cleanLaboratoryCandidate(raw)
}

function resolveLaboratory(text: string, fileName: string): string {
	const searchable = `${text}\n${fileName}`

	if (/Clinically Tested by\s*:\s*Thyrocare/i.test(text)) {
		return 'Thyrocare Technologies Ltd'
	}

	if (/thyrocare|Sohrabh Hall|Aarogyam|HDFC COMBO/i.test(searchable)) {
		return 'Thyrocare'
	}

	const organization = text.match(ORGANIZATION_PATTERN)?.[1]?.trim()

	if (organization && isPlausibleLaboratoryName(organization)) {
		return cleanLaboratoryCandidate(organization)
	}

	const explicit = text.match(LABORATORY_LABEL_PATTERN)?.[1]?.trim()

	if (explicit && isPlausibleLaboratoryName(explicit) && explicit.length < 80) {
		return cleanLaboratoryCandidate(explicit)
	}

	const recovered = recoverLaboratoryFromText(searchable)

	if (recovered) {
		return recovered
	}

	return 'Unknown Laboratory'
}

function resolvePatientName(text: string): string | null {
	const match = text.match(PATIENT_NAME_PATTERN)?.[1]?.trim()

	if (!match || isTemplatePlaceholder(match)) {
		return null
	}

	return cleanPersonName(match)
}

function resolveDoctorName(text: string): string | null {
	const referral = text.match(REFERRAL_PATTERN)?.[1]?.trim()

	if (referral && isPlausibleDoctorName(referral)) {
		return normalizeDoctorCandidate(referral)
	}

	const signature = text.match(DOCTOR_SIGNATURE_PATTERN)?.[0]?.trim()

	if (signature && isPlausibleDoctorName(signature)) {
		return normalizeDoctorCandidate(signature)
	}

	const explicit = text.match(DOCTOR_PATTERN)?.[1]?.trim()

	if (explicit && isPlausibleDoctorName(explicit)) {
		return normalizeDoctorCandidate(explicit)
	}

	return null
}

function resolveReferenceNumber(text: string): string | null {
	const patientId = text.match(PATIENT_ID_PATTERN)?.[1]?.trim()

	if (patientId && isPlausibleReferenceNumber(patientId)) {
		return patientId
	}

	const match = text.match(REFERENCE_NUMBER_PATTERN)?.[1]?.trim()

	if (!match || !isPlausibleReferenceNumber(match)) {
		return null
	}

	return match
}

export function resolveReportDateFromFileName(fileName: string): string | null {
	const yearMonth = fileName.match(/\b(20\d{2})\s+([A-Za-z]{3})\b/i)

	if (yearMonth) {
		const [, year, monthRaw] = yearMonth
		const month =
			monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1, 3).toLowerCase()
		const monthNumber = MONTHS[month]

		if (monthNumber) {
			return `${year}-${monthNumber}-01`
		}
	}

	const monthYear = fileName.match(/\b([A-Za-z]{3,9})\s+(20\d{2})\b/i)

	if (monthYear) {
		const [, monthRaw, year] = monthYear
		const month =
			monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1, 3).toLowerCase()
		const monthNumber = MONTHS[month]

		if (monthNumber) {
			return `${year}-${monthNumber}-01`
		}
	}

	const dmy = fileName.match(/\b(\d{2})[/-](\d{2})[/-](\d{2,4})\b/)

	if (dmy) {
		const [, day, month, rawYear] = dmy
		const year = rawYear.length === 2 ? `20${rawYear}` : rawYear

		return `${year}-${month}-${day}`
	}

	const iso = fileName.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)

	if (iso) {
		return `${iso[1]}-${iso[2]}-${iso[3]}`
	}

	const leadingYear = fileName.match(/^(20\d{2})\b/)

	if (leadingYear) {
		return `${leadingYear[1]}-01-01`
	}

	return null
}

function resolveReportDate(text: string, fileName: string): string | null {
	const headerBlock = text.slice(0, 1500)
	const thyrocareDates = headerBlock.match(
		/Processed At[\s\S]{0,500}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})[\s\S]{0,120}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})[\s\S]{0,120}?(\d{2}\s+[A-Za-z]{3}\s+\d{4})/i,
	)

	if (thyrocareDates) {
		return parseDate(thyrocareDates[3])
	}

	return (
		parseDate(text.match(REPORT_DATE_PATTERN)?.[1] ?? null) ??
		parseDate(text.match(THYROCARE_RRT_DATE_PATTERN)?.[1] ?? null) ??
		parseDate(text.match(COLLECTION_DATE_PATTERN)?.[1] ?? null) ??
		resolveReportDateFromFileName(fileName)
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
		reportDate: resolveReportDate(text, fileName),
		collectionDate: parseDate(text.match(COLLECTION_DATE_PATTERN)?.[1] ?? null),
		referenceNumber: resolveReferenceNumber(text),
		patientName: resolvePatientName(text),
		doctorName: resolveDoctorName(text),
	}
}
