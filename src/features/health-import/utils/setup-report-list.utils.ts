import type { ImportQueueStatus } from '@/core/connectors'
import { IMPORT_QUEUE_LABELS, isImportQueueActive } from '@/core/connectors'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import { reportEligibleForAiReprocess } from '@/features/health/services/health-ai-extraction.service'
import {
	isReportDisplayReady,
	isReportProcessing,
	isReportStuckInProcessing,
	metricsDisplayMessage,
	reportNeedsReprocess,
} from '@/features/health/services/report-readiness.service'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { UploadedHealthReport } from '@/features/health/types'
import type {
	BuildSetupReportRowsInput,
	SetupReportListFilter,
	SetupReportRowModel,
	SetupReportRowStatus,
} from '@/features/health-import/types/setup-report-list.types'
import { PHOTO_IMPORT_SKIP_MESSAGE } from '@/features/health-import/constants/import-file-rules'

const STATUS_SORT_RANK: Record<SetupReportRowStatus, number> = {
	failed: 0,
	needs_reprocess: 1,
	skipped: 2,
	processing: 3,
	ready: 4,
}

const REPORT_STATUS_LABELS: Record<string, string> = {
	uploaded: 'Uploaded',
	queued: 'Queued',
	processing: 'Processing',
	parsed: 'Parsing',
	completed: 'Finalizing',
}

const ACTIVE_REGISTRY_STATUSES = new Set<ImportQueueStatus>([
	'discovered',
	'queued',
	'downloading',
	'imported',
	'ocr',
	'parsing',
	'knowledge_graph',
	'retry',
])

function isLegacyPhotoFailureMessage(
	message: string | null | undefined,
): boolean {
	if (!message) {
		return false
	}

	const lower = message.toLowerCase()

	return (
		message === PHOTO_IMPORT_SKIP_MESSAGE ||
		lower.includes('photo') ||
		lower.includes('not a laboratory report')
	)
}

export function filterRegistryForMember(
	registry: ConnectorDocumentRecord[],
	memberId: string | null | undefined,
	accountOwnerMemberId: string | null,
	memberReportIds: Set<string>,
): ConnectorDocumentRecord[] {
	if (!memberId) {
		return registry
	}

	return registry.filter((record) => {
		if (record.healthReportId && memberReportIds.has(record.healthReportId)) {
			return true
		}

		if (!record.familyMemberId) {
			return memberId === accountOwnerMemberId
		}

		return record.familyMemberId === memberId
	})
}

/**
 * Report terminal states win over stale registry importStatus (e.g. registry still "ocr"
 * while health_reports.status is already failed).
 */
export function deriveSetupReportStatus(input: {
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): SetupReportRowStatus {
	const { registry, report } = input

	if (registry?.importStatus === 'skipped') {
		return 'skipped'
	}

	if (
		registry?.importStatus === 'failed' &&
		isLegacyPhotoFailureMessage(registry.errorMessage)
	) {
		return 'skipped'
	}

	if (report) {
		if (isReportDisplayReady(report)) {
			return 'ready'
		}

		if (report.status === 'failed') {
			return 'failed'
		}

		if (reportNeedsReprocess(report)) {
			return 'needs_reprocess'
		}

		if (isReportStuckInProcessing(report)) {
			return 'needs_reprocess'
		}

		if (isReportProcessing(report)) {
			return 'processing'
		}
	}

	if (registry?.importStatus === 'failed') {
		return 'failed'
	}

	if (
		registry &&
		(isImportQueueActive(registry.importStatus) ||
			ACTIVE_REGISTRY_STATUSES.has(registry.importStatus))
	) {
		return 'processing'
	}

	if (report?.status === 'completed') {
		return 'needs_reprocess'
	}

	if (registry?.importStatus === 'completed' && !report) {
		return 'processing'
	}

	return registry ? 'processing' : 'failed'
}

function currentFailureMessage(input: {
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): string | null {
	const { registry, report } = input

	if (report?.processing_error?.trim()) {
		return report.processing_error.trim()
	}

	if (registry?.errorMessage?.trim()) {
		return registry.errorMessage.trim()
	}

	return null
}

export function inferFailedStageFromMessage(
	message: string | null | undefined,
): string | null {
	if (!message) {
		return null
	}

	const lower = message.toLowerCase()

	if (
		lower.includes('download') ||
		lower.includes('google drive') ||
		lower.includes('reconnect drive')
	) {
		return 'Downloading'
	}

	if (lower.includes('ocr')) {
		return 'OCR'
	}

	if (
		lower.includes('parser') ||
		lower.includes('metrics') ||
		lower.includes('laboratory')
	) {
		return 'Parsing'
	}

	if (lower.includes('photo') || lower.includes('not a lab')) {
		return 'Validation'
	}

	return null
}

function inferFailedStage(input: {
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): string | null {
	const message = currentFailureMessage(input)

	if (input.registry && input.registry.importStatus !== 'failed') {
		const label = IMPORT_QUEUE_LABELS[input.registry.importStatus]

		if (label && label !== 'Failed') {
			return label
		}
	}

	const fromMessage = inferFailedStageFromMessage(message)

	if (fromMessage) {
		return fromMessage
	}

	if (input.report?.status === 'failed') {
		return (
			inferFailedStageFromMessage(input.report.processing_error) ?? 'Parsing'
		)
	}

	return null
}

function deriveSetupReportReason(input: {
	status: SetupReportRowStatus
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): string | null {
	const { status, registry, report } = input

	if (status === 'skipped') {
		return registry?.errorMessage ?? registry?.discoveryReason ?? 'Skipped'
	}

	if (status === 'failed') {
		return (
			currentFailureMessage({ registry, report }) ??
			'Import or processing failed'
		)
	}

	if (status === 'needs_reprocess' && report) {
		return metricsDisplayMessage({ report, storedMetricCount: 0 })
	}

	return null
}

function deriveStageLabel(input: {
	status: SetupReportRowStatus
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): string | null {
	if (input.status !== 'processing') {
		return null
	}

	if (input.registry) {
		return IMPORT_QUEUE_LABELS[input.registry.importStatus]
	}

	if (input.report) {
		return REPORT_STATUS_LABELS[input.report.status] ?? input.report.status
	}

	return null
}

function buildErrorLog(input: {
	status: SetupReportRowStatus
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
	failedStage: string | null
}): string | null {
	if (input.status !== 'failed' && input.status !== 'needs_reprocess') {
		return null
	}

	const message = currentFailureMessage({
		registry: input.registry,
		report: input.report,
	})

	if (!message) {
		return null
	}

	const parts = [`Error: ${message}`]
	const stage = input.failedStage ?? inferFailedStageFromMessage(message)

	if (stage) {
		parts.push(`Stage: ${stage}`)
	}

	return parts.join('\n')
}

function buildRowModel(input: {
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): SetupReportRowModel {
	const { registry, report } = input
	const parsed = report ? getParsedHealthReport(report) : null
	const status = deriveSetupReportStatus({ registry, report })
	const title = report
		? getReportDisplayTitle(report)
		: (registry?.fileName ?? 'Unknown file')
	const date = report
		? getReportDisplayDate(report, parsed)
		: (registry?.detectedReportDate ??
			registry?.externalModifiedAt ??
			registry?.importedAt ??
			'')
	const lab = parsed?.metadata.laboratory ?? registry?.detectedReportType ?? ''
	const subtitle = [date, lab].filter(Boolean).join(' · ')
	const reason = deriveSetupReportReason({ status, registry, report })
	const stageLabel = deriveStageLabel({ status, registry, report })
	const failedStage = inferFailedStage({ registry, report })
	const reportId = report?.id ?? registry?.healthReportId ?? null
	const aiEligible = report ? reportEligibleForAiReprocess(report) : false

	return {
		key: registry?.id ?? report?.id ?? title,
		registryId: registry?.id ?? null,
		reportId,
		title,
		subtitle,
		status,
		reason,
		stageLabel,
		failedStage,
		errorLog: buildErrorLog({ status, registry, report, failedStage }),
		sortDate:
			report?.report_date ??
			report?.uploaded_at ??
			registry?.importedAt ??
			registry?.lastSyncAt ??
			'',
		canReimport: status === 'failed' && Boolean(registry?.id ?? reportId),
		canReprocess:
			Boolean(reportId) &&
			(status === 'failed' || status === 'needs_reprocess'),
		canReprocessWithAi:
			aiEligible && (status === 'failed' || status === 'needs_reprocess'),
		canViewReport: Boolean(reportId) && status === 'ready',
	}
}

/**
 * Merge connector registry rows with uploaded health reports (one row per file/report).
 * Sort: needs-attention statuses first, then processing, then ready; within rank, newest date first.
 */
export function buildSetupReportRows(
	input: BuildSetupReportRowsInput,
): SetupReportRowModel[] {
	const memberReportIds = new Set(input.reports.map((report) => report.id))
	const registry = filterRegistryForMember(
		input.registry,
		input.memberId,
		input.accountOwnerMemberId,
		memberReportIds,
	)
	const reportById = new Map(input.reports.map((report) => [report.id, report]))
	const linkedReportIds = new Set<string>()
	const rows: SetupReportRowModel[] = []

	for (const record of registry) {
		const linkedReport = record.healthReportId
			? (reportById.get(record.healthReportId) ?? null)
			: null

		if (linkedReport) {
			linkedReportIds.add(linkedReport.id)
		}

		rows.push(buildRowModel({ registry: record, report: linkedReport }))
	}

	for (const memberReport of input.reports) {
		if (linkedReportIds.has(memberReport.id)) {
			continue
		}

		rows.push(buildRowModel({ registry: null, report: memberReport }))
	}

	return rows.sort(compareSetupReportRows)
}

export function compareSetupReportRows(
	a: SetupReportRowModel,
	b: SetupReportRowModel,
): number {
	const rankDiff = STATUS_SORT_RANK[a.status] - STATUS_SORT_RANK[b.status]

	if (rankDiff !== 0) {
		return rankDiff
	}

	return Date.parse(b.sortDate || '0') - Date.parse(a.sortDate || '0')
}

export function filterSetupReportRows(
	rows: SetupReportRowModel[],
	filter: SetupReportListFilter,
): SetupReportRowModel[] {
	switch (filter) {
		case 'all':
			return rows
		case 'ready':
			return rows.filter((row) => row.status === 'ready')
		case 'needs_attention':
			return rows.filter(
				(row) => row.status === 'failed' || row.status === 'needs_reprocess',
			)
		case 'skipped':
			return rows.filter((row) => row.status === 'skipped')
	}
}

/** Default list hides skipped duplicates unless showDuplicates is enabled. */
export function applySetupListVisibility(
	rows: SetupReportRowModel[],
	filter: SetupReportListFilter,
	showDuplicates: boolean,
): SetupReportRowModel[] {
	const filtered = filterSetupReportRows(rows, filter)

	if (showDuplicates || filter === 'skipped') {
		return filtered
	}

	return filtered.filter((row) => row.status !== 'skipped')
}

export function countSetupRowsByFilter(rows: SetupReportRowModel[]): {
	all: number
	needsAttention: number
	ready: number
	failed: number
	needsReprocess: number
	processing: number
	skipped: number
} {
	return {
		all: rows.length,
		needsAttention: rows.filter(
			(row) => row.status === 'failed' || row.status === 'needs_reprocess',
		).length,
		ready: rows.filter((row) => row.status === 'ready').length,
		failed: rows.filter((row) => row.status === 'failed').length,
		needsReprocess: rows.filter((row) => row.status === 'needs_reprocess')
			.length,
		processing: rows.filter((row) => row.status === 'processing').length,
		skipped: rows.filter((row) => row.status === 'skipped').length,
	}
}

/** Summary aligned with visible setup row counts (excludes skipped from incomplete). */
export function buildSetupSummaryLine(rows: SetupReportRowModel[]): string {
	const counts = countSetupRowsByFilter(rows)
	const parts = [`${counts.ready} ready`]

	if (counts.failed > 0) {
		parts.push(`${counts.failed} failed`)
	}

	if (counts.needsReprocess > 0) {
		parts.push(`${counts.needsReprocess} need reprocess`)
	}

	if (counts.processing > 0) {
		parts.push(`${counts.processing} processing`)
	}

	if (counts.skipped > 0) {
		parts.push(`${counts.skipped} skipped`)
	}

	return parts.join(' · ')
}

export function setupReportStatusLabel(status: SetupReportRowStatus): string {
	switch (status) {
		case 'ready':
			return 'Ready'
		case 'processing':
			return 'Processing'
		case 'failed':
			return 'Failed'
		case 'needs_reprocess':
			return 'Needs reprocess'
		case 'skipped':
			return 'Skipped'
	}
}

export function setupReportStatusColor(status: SetupReportRowStatus): string {
	switch (status) {
		case 'ready':
			return '#22c55e'
		case 'processing':
			return '#3b82f6'
		case 'failed':
			return '#ef4444'
		case 'needs_reprocess':
			return '#f59e0b'
		case 'skipped':
			return '#94a3b8'
	}
}
