import type { ConnectorDocumentRecord } from '@/core/connectors'
import { filterReportsForMember } from '@/features/family/utils/member-display'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import {
	isReportDisplayReady,
	isReportProcessing,
	reportNeedsReprocess,
} from '@/features/health/services/report-readiness.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type {
	CorpusCompleteness,
	CoverageFailureGroups,
	CoverageReportSummary,
	HealthCoverageSnapshot,
	ReportBadgeStatus,
} from '@/features/health/types/health-coverage.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

/**
 * Screen filter reference (keep in sync with UI):
 * - displayReady: Health Reports tab, Ask latest-report intents, Overview latest card
 * - timelineEligible: completed reports in journey (incomplete ones flagged in UI)
 * - completedCount: health_reports.status === 'completed' regardless of metrics
 */

export function deriveReportBadgeStatus(input: {
	classifiedCount: number
	unknownCount: number
	hasAbnormal: boolean
	needsReprocess: boolean
}): ReportBadgeStatus {
	if (input.needsReprocess || input.classifiedCount === 0) {
		return 'needs_reprocess'
	}

	if (input.unknownCount > 0) {
		return 'partial'
	}

	if (input.hasAbnormal) {
		return 'review'
	}

	return 'normal'
}

function metricCounts(report: UploadedHealthReport) {
	const parsed = getParsedHealthReport(report)
	const metrics = parsed?.metrics ?? []
	const unknownCount = metrics.filter(
		(metric) => metric.status === 'unknown',
	).length
	const classifiedCount = metrics.length - unknownCount
	const hasAbnormal = metrics.some((metric) => ABNORMAL.has(metric.status))

	return {
		totalMetrics: metrics.length,
		unknownCount,
		classifiedCount,
		hasAbnormal,
	}
}

export function buildCoverageReportSummary(
	report: UploadedHealthReport,
): CoverageReportSummary {
	const parsed = getParsedHealthReport(report)
	const counts = metricCounts(report)
	const isDisplayReady = isReportDisplayReady(report)
	const needsReprocess = reportNeedsReprocess(report)

	return {
		id: report.id,
		title: getReportDisplayTitle(report),
		date: getReportDisplayDate(report, parsed),
		lab: parsed?.metadata.laboratory ?? '',
		classifiedCount: counts.classifiedCount,
		unknownCount: counts.unknownCount,
		totalMetrics: counts.totalMetrics,
		isDisplayReady,
		needsReprocess,
		badgeStatus: deriveReportBadgeStatus({
			...counts,
			needsReprocess,
		}),
	}
}

export function groupImportFailures(
	registry: ConnectorDocumentRecord[],
): CoverageFailureGroups {
	const failed = registry.filter((record) => record.importStatus === 'failed')
	const groups: CoverageFailureGroups = {
		download: 0,
		noMetrics: 0,
		nonLab: 0,
		other: 0,
	}

	for (const record of failed) {
		const message = (record.errorMessage ?? '').toLowerCase()
		const fileName = record.fileName.toLowerCase()

		if (
			message.includes('download') ||
			message.includes('reconnect drive') ||
			message.includes('google drive')
		) {
			groups.download += 1
			continue
		}

		if (
			message.includes('no laboratory metrics') ||
			message.includes('ocr completed but no')
		) {
			groups.noMetrics += 1
			continue
		}

		if (
			message.includes('not a lab') ||
			message.includes('not a laboratory') ||
			message.includes('expected a health report') ||
			message.includes('photo') ||
			/\.(jpg|jpeg|png|gif|webp|heic)$/.test(fileName)
		) {
			groups.nonLab += 1
			continue
		}

		groups.other += 1
	}

	return groups
}

function deriveCorpusCompleteness(input: {
	displayReadyCount: number
	discoveredCount: number
	failedCount: number
	reportSummaries: CoverageReportSummary[]
}): CorpusCompleteness {
	if (input.displayReadyCount === 0) {
		return 'empty'
	}

	const readySummaries = input.reportSummaries.filter(
		(report) => report.isDisplayReady,
	)
	const hasHeavyUnknown = readySummaries.some(
		(report) =>
			report.totalMetrics > 0 &&
			report.unknownCount / report.totalMetrics > 0.3,
	)
	const hasReprocess = input.reportSummaries.some(
		(report) => report.needsReprocess,
	)

	if (
		hasHeavyUnknown ||
		input.failedCount > 0 ||
		input.displayReadyCount < input.discoveredCount ||
		hasReprocess
	) {
		return 'partial'
	}

	const majorityClassified = readySummaries.every(
		(report) =>
			report.totalMetrics === 0 ||
			report.unknownCount / report.totalMetrics <= 0.3,
	)

	if (input.displayReadyCount >= 2 && majorityClassified) {
		return 'ready'
	}

	if (
		input.displayReadyCount === 1 &&
		(readySummaries[0]?.classifiedCount ?? 0) >= 30
	) {
		return 'ready'
	}

	return 'partial'
}

function buildCoverageLimitations(input: {
	failedCount: number
	reprocessCount: number
	displayReadyCount: number
	discoveredCount: number
	corpusCompleteness: CorpusCompleteness
}): string[] {
	const limitations: string[] = []

	if (input.failedCount > 0) {
		limitations.push(
			`${input.failedCount} file${input.failedCount === 1 ? '' : 's'} need your help — open Report imports to try again.`,
		)
	}

	if (input.reprocessCount > 0) {
		limitations.push(
			`${input.reprocessCount} report${input.reprocessCount === 1 ? '' : 's'} need reprocessing for complete metrics.`,
		)
	}

	if (
		input.corpusCompleteness === 'partial' &&
		input.discoveredCount > input.displayReadyCount
	) {
		limitations.push(
			`Only ${input.displayReadyCount} of ${input.discoveredCount} discovered files are fully usable in Health.`,
		)
	}

	return limitations
}

export function buildCoverageSummaryLine(input: {
	displayReadyCount: number
	failedCount: number
	reprocessCount: number
	importedCount: number
}): string {
	const parts = [
		`${input.displayReadyCount} report${input.displayReadyCount === 1 ? '' : 's'} ready`,
	]

	if (input.importedCount > input.displayReadyCount) {
		parts.push(`${input.importedCount - input.displayReadyCount} incomplete`)
	}

	if (input.failedCount > 0) {
		parts.push(`${input.failedCount} failed`)
	}

	if (input.reprocessCount > 0) {
		parts.push(`${input.reprocessCount} need reprocess`)
	}

	return parts.join(' · ')
}

export function buildHealthCoverageSnapshot(input: {
	uploadedReports: UploadedHealthReport[]
	importRegistry?: ConnectorDocumentRecord[]
	storedMetrics?: StoredHealthMetric[]
	memberId?: string | null
	accountOwnerMemberId?: string | null
}): HealthCoverageSnapshot {
	void input.storedMetrics

	const registry = input.importRegistry ?? []
	const reports =
		input.memberId != null
			? filterReportsForMember(
					input.uploadedReports,
					input.memberId,
					input.accountOwnerMemberId ?? null,
				)
			: input.uploadedReports

	const reportSummaries = reports.map(buildCoverageReportSummary)
	const displayReadyCount = reportSummaries.filter(
		(report) => report.isDisplayReady,
	).length
	const completedCount = reports.filter(
		(report) => report.status === 'completed',
	).length
	const processingCount = reports.filter(isReportProcessing).length

	const discoveredCount = registry.length > 0 ? registry.length : reports.length

	const importedCount =
		registry.length > 0
			? registry.filter((record) => record.importStatus === 'completed').length
			: completedCount

	const failedCount = registry.filter(
		(record) => record.importStatus === 'failed',
	).length

	const reportsNeedingReprocess = reportSummaries
		.filter((report) => report.needsReprocess)
		.map((report) => report.id)

	const latestUsableReport =
		[...reportSummaries]
			.filter((report) => report.isDisplayReady)
			.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null

	const failureGroups = groupImportFailures(registry)
	const reprocessCount = reportsNeedingReprocess.length

	const corpusCompleteness = deriveCorpusCompleteness({
		displayReadyCount,
		discoveredCount,
		failedCount,
		reportSummaries,
	})

	const summaryLine = buildCoverageSummaryLine({
		displayReadyCount,
		failedCount,
		reprocessCount,
		importedCount,
	})

	return {
		discoveredCount,
		importedCount,
		failedCount,
		processingCount,
		displayReadyCount,
		completedCount,
		reportsNeedingReprocess,
		latestUsableReport,
		corpusCompleteness,
		limitations: buildCoverageLimitations({
			failedCount,
			reprocessCount,
			displayReadyCount,
			discoveredCount,
			corpusCompleteness,
		}),
		summaryLine,
		failureGroups,
	}
}
