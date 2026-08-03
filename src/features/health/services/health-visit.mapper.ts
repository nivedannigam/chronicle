import { classifyReportType } from '@/features/health-intelligence/services/report-type.classifier'
import type { ReportTimelineKind } from '@/features/health-intelligence/types/health-profile.types'
import type {
	HealthVisit,
	HealthVisitDocument,
} from '@/features/health/types/health-visit.types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	getParsedHealthReport,
	getReportDisplayDate,
} from '@/features/health/services/health-parsed-report.service'
import { formatLaboratoryDisplayName } from '@/features/health/extraction/health-metadata.parser'
import {
	buildProductReportCard,
	mapProductReportStatus,
	type ProductReportStatus,
} from '@/features/health/services/health-product.mapper'
import { USER_VOCAB } from '@/constants/user-vocabulary'

const PRODUCT_STATUS_LABEL: Record<ProductReportStatus, string> = {
	ready: USER_VOCAB.productReportStatus.ready,
	organizing: USER_VOCAB.productReportStatus.organizing,
	needs_help: USER_VOCAB.productReportStatus.needsHelp,
}

const DATE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000
const UNKNOWN_LAB = 'medical center'

interface ReportVisitContext {
	report: UploadedHealthReport
	reportId: string
	dateMs: number
	date: string
	hospitalKey: string
	hospital: string
	visitTitleHint: string | null
	kind: ReportTimelineKind
}

function normalizeHospital(value: string | null | undefined): string {
	const display = formatLaboratoryDisplayName(value, '')
	const trimmed = display.trim().toLowerCase()

	if (!trimmed || trimmed === UNKNOWN_LAB) {
		return ''
	}

	return trimmed.replace(/\s+/g, ' ')
}

function parseDateMs(value: string): number {
	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? 0 : parsed
}

function datesWithinWindow(left: number, right: number): boolean {
	if (left === 0 || right === 0) {
		return false
	}

	return Math.abs(left - right) <= DATE_WINDOW_MS
}

/** Extract a visit-level title hint from filename (date/type prefixes stripped). */
export function extractVisitTitleHint(fileName: string): string | null {
	const withoutExtension = fileName.replace(/\.pdf$/i, '').trim()
	const withoutLeadingDate = withoutExtension
		.replace(/^\d{4}\s*[-–]\s*/i, '')
		.replace(/^\d{4}\s+[A-Za-z]{3,9}\s*[-–]\s*/i, '')
		.replace(/^\d{2}[-/]\d{2}[-/]\d{4}\s*[-–]\s*/i, '')
		.trim()

	const normalized = withoutLeadingDate
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	if (normalized.length < 4) {
		return null
	}

	const lower = normalized.toLowerCase()

	if (
		/blood test|cbc|lipid|thyroid|vitamin|ecg|urine|report$/i.test(
			normalized,
		) &&
		!/checkup|consult|admission|executive|annual|health summary|wellness/i.test(
			normalized,
		)
	) {
		return null
	}

	if (lower.endsWith(' report')) {
		return normalized.slice(0, -7).trim() || null
	}

	return normalized
}

function normalizeTitleHint(value: string | null): string {
	return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function visitTitleHintsMatch(
	left: string | null,
	right: string | null,
): boolean {
	const a = normalizeTitleHint(left)
	const b = normalizeTitleHint(right)

	if (!a || !b) {
		return false
	}

	if (a === b) {
		return true
	}

	return a.includes(b) || b.includes(a)
}

function buildReportContext(report: UploadedHealthReport): ReportVisitContext {
	const classified = classifyReportType(report)
	const parsed = getParsedHealthReport(report)
	const date = getReportDisplayDate(report, parsed)

	return {
		report,
		reportId: report.id,
		dateMs: parseDateMs(date),
		date,
		hospitalKey: normalizeHospital(parsed?.metadata.laboratory),
		hospital: formatLaboratoryDisplayName(parsed?.metadata.laboratory),
		visitTitleHint: extractVisitTitleHint(report.file_name),
		kind: classified.kind,
	}
}

function canGroupReports(
	left: ReportVisitContext,
	right: ReportVisitContext,
): boolean {
	if (!datesWithinWindow(left.dateMs, right.dateMs)) {
		return false
	}

	const sameHospital =
		left.hospitalKey.length > 0 &&
		right.hospitalKey.length > 0 &&
		left.hospitalKey === right.hospitalKey

	if (sameHospital) {
		return true
	}

	if (!left.visitTitleHint || !right.visitTitleHint) {
		return false
	}

	if (!visitTitleHintsMatch(left.visitTitleHint, right.visitTitleHint)) {
		return false
	}

	const hospitalConflict =
		left.hospitalKey.length > 0 &&
		right.hospitalKey.length > 0 &&
		left.hospitalKey !== right.hospitalKey

	return !hospitalConflict
}

function clusterReports(
	contexts: ReportVisitContext[],
): ReportVisitContext[][] {
	const sorted = [...contexts].sort((a, b) => b.dateMs - a.dateMs)
	const clusters: ReportVisitContext[][] = []

	for (const context of sorted) {
		let placed = false

		for (const cluster of clusters) {
			if (cluster.some((member) => canGroupReports(member, context))) {
				cluster.push(context)
				placed = true
				break
			}
		}

		if (!placed) {
			clusters.push([context])
		}
	}

	return clusters
}

function buildVisitId(reportIds: string[]): string {
	const sorted = [...reportIds].sort()

	if (sorted.length === 1) {
		return sorted[0]
	}

	return `visit-${sorted[0]}`
}

function aggregateVisitStatus(
	statuses: ProductReportStatus[],
): ProductReportStatus {
	if (statuses.includes('needs_help')) {
		return 'needs_help'
	}

	if (statuses.includes('organizing')) {
		return 'organizing'
	}

	return 'ready'
}

function countImportantFindings(reports: UploadedHealthReport[]): number {
	let count = 0

	for (const report of reports) {
		const parsed = getParsedHealthReport(report)
		const metrics = parsed?.metrics ?? []

		count += metrics.filter((metric) =>
			['low', 'high', 'critical', 'borderline'].includes(metric.status),
		).length
	}

	return count
}

function inferVisitTitle(contexts: ReportVisitContext[]): string {
	const kinds = contexts.map((context) => context.kind)
	const searchable = contexts
		.flatMap((context) => [
			context.visitTitleHint ?? '',
			context.report.file_name,
		])
		.join(' ')
		.toLowerCase()

	if (
		kinds.includes('annual_checkup') ||
		/executive health|master health/i.test(searchable)
	) {
		return /executive health/i.test(searchable)
			? 'Executive Health Check'
			: 'Annual Health Checkup'
	}

	if (/emergency|er visit|casualty/i.test(searchable)) {
		return 'Emergency Visit'
	}

	if (/admission|discharge|inpatient|hospital stay/i.test(searchable)) {
		return 'Hospital Admission'
	}

	if (
		kinds.includes('specialist_visit') ||
		/consult|consultation/i.test(searchable)
	) {
		return 'Specialist Consultation'
	}

	const sharedHint = contexts
		.map((context) => context.visitTitleHint)
		.find((hint) =>
			contexts.every((item) => visitTitleHintsMatch(hint, item.visitTitleHint)),
		)

	if (sharedHint) {
		return titleCase(sharedHint)
	}

	if (
		contexts.length >= 2 &&
		/checkup|annual|wellness|health summary/i.test(searchable)
	) {
		return 'Health Checkup'
	}

	if (contexts.length >= 2) {
		return 'Health Checkup'
	}

	return classifyReportType(contexts[0].report).displayKind
}

function titleCase(value: string): string {
	return value
		.split(/\s+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

function formatDisplayDate(value: string): string {
	const parsed = Date.parse(value)
	if (Number.isNaN(parsed)) {
		return value
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function formatMonthYear(value: string): string {
	const parsed = Date.parse(value)
	if (Number.isNaN(parsed)) {
		return value
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	})
}

function buildSummaryLine(
	findingCount: number,
	reportCount: number,
	status: ProductReportStatus,
): string {
	if (status === 'organizing') {
		return 'Still organizing results'
	}

	if (status === 'needs_help') {
		return 'Needs your help'
	}

	if (findingCount > 0) {
		return `${findingCount} important finding${findingCount === 1 ? '' : 's'}`
	}

	if (reportCount > 1) {
		return `${reportCount} documents reviewed`
	}

	return 'Results reviewed'
}

function buildSummaryParagraph(input: {
	title: string
	hospital: string
	reportCount: number
	findingCount: number
	status: ProductReportStatus
}): string {
	const location =
		input.hospital && input.hospital !== 'Medical center'
			? ` at ${input.hospital}`
			: ''

	if (input.status === 'needs_help') {
		if (input.reportCount > 1) {
			return `This ${input.title.toLowerCase()} includes ${input.reportCount} documents${location}, but Chronicle could not finish organizing every one. Open the documents below to retry or review what failed.`
		}

		return `Chronicle could not finish organizing this visit${location}. Open the document below to retry or review what failed.`
	}

	if (input.status === 'organizing') {
		return `Chronicle is still organizing the documents from this visit${location}.`
	}

	if (input.reportCount > 1) {
		if (input.findingCount > 0) {
			return `This ${input.title.toLowerCase()} included ${input.reportCount} documents${location}. Chronicle found ${input.findingCount} result${input.findingCount === 1 ? '' : 's'} worth a closer look across the visit.`
		}

		return `This ${input.title.toLowerCase()} brought together ${input.reportCount} documents${location}. Chronicle organized them into one health visit for you.`
	}

	if (input.findingCount > 0) {
		return `During this visit${location}, Chronicle noted ${input.findingCount} result${input.findingCount === 1 ? '' : 's'} that may deserve attention.`
	}

	if (input.status === 'ready') {
		return `This visit${location} looks complete. Chronicle reviewed the available results and found nothing urgent to flag.`
	}

	return `Chronicle is still organizing the documents from this visit${location}.`
}

function buildChronicleSummaryPlaceholder(input: {
	title: string
	findingCount: number
	reportCount: number
	status: ProductReportStatus
}): string {
	if (input.status !== 'ready') {
		return 'Chronicle is still organizing this visit. A fuller summary will appear once every document is ready.'
	}

	if (input.findingCount > 0) {
		return `Overall, this ${input.title.toLowerCase()} surfaced ${input.findingCount} result${input.findingCount === 1 ? '' : 's'} outside the usual range. Open Results below for the specifics Chronicle already extracted.`
	}

	if (input.reportCount > 1) {
		return `This visit combines ${input.reportCount} documents into one picture. The available results look broadly stable based on what Chronicle could read.`
	}

	return 'Based on the documents Chronicle could read, this visit looks straightforward with no urgent flags in the extracted results.'
}

function buildVisitFromCluster(contexts: ReportVisitContext[]): HealthVisit {
	const reports = contexts.map((context) => context.report)
	const cards = reports.map(buildProductReportCard)
	const reportIds = reports.map((report) => report.id)
	const statuses = reports.map(mapProductReportStatus)
	const status = aggregateVisitStatus(statuses)
	const anchor = contexts.reduce((earliest, context) =>
		context.dateMs > 0 &&
		(earliest.dateMs === 0 || context.dateMs < earliest.dateMs)
			? context
			: earliest,
	)
	const title = inferVisitTitle(contexts)
	const findingCount = countImportantFindings(reports)
	const reportCount = reports.length

	const documents: HealthVisitDocument[] = cards.map((card) => ({
		reportId: card.id,
		title: card.title,
		documentType: card.documentType,
		status: card.status,
		statusLabel: card.statusLabel,
	}))

	const summaryLine = buildSummaryLine(findingCount, reportCount, status)

	return {
		id: buildVisitId(reportIds),
		title,
		date: anchor.date,
		displayDate: formatDisplayDate(anchor.date),
		displayMonthYear: formatMonthYear(anchor.date),
		hospital: anchor.hospital,
		reportIds,
		reportCount,
		documents,
		summaryLine,
		summaryParagraph: buildSummaryParagraph({
			title,
			hospital: anchor.hospital,
			reportCount,
			findingCount,
			status,
		}),
		findingCount,
		status,
		statusLabel: PRODUCT_STATUS_LABEL[status],
		isGrouped: reportCount > 1,
	}
}

export function buildHealthVisits(
	reports: UploadedHealthReport[],
): HealthVisit[] {
	if (reports.length === 0) {
		return []
	}

	const contexts = reports.map(buildReportContext)
	const clusters = clusterReports(contexts)

	return clusters
		.map(buildVisitFromCluster)
		.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

export function findHealthVisit(
	visits: HealthVisit[],
	visitId: string | undefined,
): HealthVisit | null {
	if (!visitId) {
		return null
	}

	return (
		visits.find((visit) => visit.id === visitId) ??
		visits.find((visit) => visit.reportIds.includes(visitId)) ??
		null
	)
}

export function pickLatestHealthVisit(
	visits: HealthVisit[],
): HealthVisit | null {
	const ready = visits.find((visit) => visit.status === 'ready')
	return ready ?? visits[0] ?? null
}

export function buildVisitChronicleSummary(visit: HealthVisit): string {
	return buildChronicleSummaryPlaceholder({
		title: visit.title,
		findingCount: visit.findingCount,
		reportCount: visit.reportCount,
		status: visit.status,
	})
}

export function buildVisitAskSuggestions(visit: HealthVisit): string[] {
	return [
		'What changed since my last visit?',
		'Is anything concerning in this visit?',
		`Explain my ${visit.title.toLowerCase()}.`,
	]
}

export {
	buildChronicleSummaryPlaceholder,
	buildSummaryParagraph,
	canGroupReports,
	clusterReports,
}
