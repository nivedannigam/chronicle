import type {
	HealthChangeItem,
	HealthCompanionView,
	HealthJourneyEvent,
	HealthReportSummary,
	HealthStatusLabel,
} from '@/features/health/types/health-companion.types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	formatReportTypeLabel,
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import {
	isReportDisplayReady,
	isReportFullyClassified,
	isReportProcessing,
	reportNeedsReprocess,
} from '@/features/health/services/report-readiness.service'
import { USER_VOCAB } from '@/constants/user-vocabulary'

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

export type ProductReportStatus = 'ready' | 'organizing' | 'needs_help'

export interface ProductReportCard {
	id: string
	title: string
	date: string
	displayDate: string
	hospital: string
	documentType: string
	status: ProductReportStatus
	statusLabel: string
}

const PRODUCT_STATUS_LABEL: Record<ProductReportStatus, string> = {
	ready: USER_VOCAB.productReportStatus.ready,
	organizing: USER_VOCAB.productReportStatus.organizing,
	needs_help: USER_VOCAB.productReportStatus.needsHelp,
}

export function mapProductReportStatus(
	report: UploadedHealthReport,
): ProductReportStatus {
	if (report.status === 'failed' || reportNeedsReprocess(report)) {
		return 'needs_help'
	}

	if (isReportProcessing(report)) {
		return 'organizing'
	}

	if (isReportFullyClassified(report)) {
		return 'ready'
	}

	if (isReportDisplayReady(report)) {
		return 'organizing'
	}

	if (report.status === 'completed') {
		return 'organizing'
	}

	return 'needs_help'
}

export function resolveDocumentTypeLabel(report: UploadedHealthReport): string {
	const parsed = getParsedHealthReport(report)
	const reportType =
		parsed?.metadata.reportType ?? report.report_type ?? 'general'

	return formatReportTypeLabel(reportType)
}

export function buildProductReportCard(
	report: UploadedHealthReport,
): ProductReportCard {
	const parsed = getParsedHealthReport(report)
	const status = mapProductReportStatus(report)
	const date = getReportDisplayDate(report, parsed)

	return {
		id: report.id,
		title: getReportDisplayTitle(report),
		date,
		displayDate: formatDisplayDate(date),
		hospital: parsed?.metadata.laboratory ?? 'Medical center',
		documentType: resolveDocumentTypeLabel(report),
		status,
		statusLabel: PRODUCT_STATUS_LABEL[status],
	}
}

export function buildProductReportCards(
	reports: UploadedHealthReport[],
): ProductReportCard[] {
	return [...reports]
		.sort(
			(a, b) =>
				Date.parse(getReportDisplayDate(b)) -
				Date.parse(getReportDisplayDate(a)),
		)
		.map(buildProductReportCard)
}

export function buildHealthGreeting(name: string | null): string {
	const hour = new Date().getHours()
	const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
	const firstName = name?.trim().split(/\s+/)[0] ?? 'there'

	return `Good ${period}, ${firstName}`
}

export function buildHealthSummarySentence(
	status: HealthStatusLabel,
	hasReports: boolean,
): string {
	if (!hasReports) {
		return "We're still learning your health history."
	}

	switch (status) {
		case 'Looking Good':
		case 'Improving':
			return "You're doing well."
		case 'Needs Attention':
		case 'Monitoring Required':
			return 'A few things deserve attention.'
		case 'Partial Results':
		case 'Awaiting Data':
		default:
			return "We're still learning your health history."
	}
}

export function buildVisitSummarySentence(report: HealthReportSummary): string {
	if (report.findings.length > 0) {
		const findings = report.findings.slice(0, 2).join(' and ')
		return `${findings} noted in this visit.`
	}

	if (
		report.summary.toLowerCase().includes('within expected range') ||
		report.summary.toLowerCase().includes('all reviewed')
	) {
		return 'Results looked stable in this visit.'
	}

	return 'Your latest health visit is ready to review.'
}

export function formatChangeLabel(change: HealthChangeItem): string {
	const direction =
		change.direction === 'improved'
			? 'improved'
			: change.direction === 'worsened'
				? 'needs attention'
				: change.direction === 'resolved'
					? 'resolved'
					: 'stable'

	if (change.detail) {
		return `${change.label} ${direction}`
	}

	return `${change.label} ${direction}`
}

export function filterMajorHistoryEvents(
	events: HealthJourneyEvent[],
): HealthJourneyEvent[] {
	return events.filter((event) => {
		if (event.isIncomplete || event.kind === 'review') {
			return false
		}

		const summary = event.summary.toLowerCase()

		return (
			!summary.includes('reprocess') &&
			!summary.includes('extraction') &&
			!summary.includes('incomplete')
		)
	})
}

export function groupHistoryEventsByYear(
	events: HealthJourneyEvent[],
): Array<[string, HealthJourneyEvent[]]> {
	const map = new Map<string, HealthJourneyEvent[]>()

	for (const event of events) {
		const year = new Date(event.date).getFullYear().toString()
		const existing = map.get(year) ?? []
		existing.push(event)
		map.set(year, existing)
	}

	return [...map.entries()].sort(
		(a, b) => Number.parseInt(b[0], 10) - Number.parseInt(a[0], 10),
	)
}

export function pickLatestVisit(
	companion: HealthCompanionView,
): HealthReportSummary | null {
	const ready = companion.recentReports.find((report) => report.isReady)
	return ready ?? companion.recentReports[0] ?? null
}

export const HEALTH_ASK_SUGGESTIONS = [
	'What should I pay attention to?',
	'Explain my latest lab results',
	'How has my cholesterol changed?',
] as const
