import { IMPORT_QUEUE_LABELS, isImportQueueActive } from '@/core/connectors'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import { reportEligibleForAiReprocess } from '@/features/health/services/health-ai-extraction.service'
import {
	isReportDisplayReady,
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

const STATUS_SORT_RANK: Record<SetupReportRowStatus, number> = {
	failed: 0,
	needs_reprocess: 1,
	skipped: 2,
	processing: 3,
	ready: 4,
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

export function deriveSetupReportStatus(input: {
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): SetupReportRowStatus {
	const { registry, report } = input

	if (registry?.importStatus === 'skipped') {
		return 'skipped'
	}

	if (registry?.importStatus === 'failed' || report?.status === 'failed') {
		return 'failed'
	}

	if (report && reportNeedsReprocess(report)) {
		return 'needs_reprocess'
	}

	if (
		(registry && isImportQueueActive(registry.importStatus)) ||
		(registry &&
			!['completed', 'failed', 'skipped', 'cancelled'].includes(
				registry.importStatus,
			) &&
			registry.importStatus !== 'retry')
	) {
		return 'processing'
	}

	if (registry?.importStatus === 'retry') {
		return 'processing'
	}

	if (report) {
		if (isReportDisplayReady(report)) {
			return 'ready'
		}

		if (report.status !== 'completed') {
			return 'processing'
		}
	}

	if (registry?.importStatus === 'completed' && !report) {
		return 'processing'
	}

	return registry ? 'processing' : 'failed'
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
			report?.processing_error ??
			registry?.errorMessage ??
			'Import or processing failed'
		)
	}

	if (status === 'needs_reprocess' && report) {
		return metricsDisplayMessage({ report, storedMetricCount: 0 })
	}

	if (status === 'processing') {
		if (registry?.errorMessage) {
			return registry.errorMessage
		}

		if (report?.processing_error) {
			return report.processing_error
		}
	}

	return null
}

function deriveStageLabel(input: {
	status: SetupReportRowStatus
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): string | null {
	if (input.status !== 'processing') {
		return input.registry?.importStatus === 'failed' ||
			input.report?.status === 'failed'
			? input.registry?.importStatus
				? IMPORT_QUEUE_LABELS[input.registry.importStatus]
				: null
			: null
	}

	if (input.registry) {
		return IMPORT_QUEUE_LABELS[input.registry.importStatus]
	}

	if (input.report) {
		return input.report.status === 'completed'
			? 'Finalizing'
			: input.report.status
	}

	return null
}

function deriveFailedStage(input: {
	registry: ConnectorDocumentRecord | null
	report: UploadedHealthReport | null
}): string | null {
	if (input.registry?.importStatus === 'failed') {
		return IMPORT_QUEUE_LABELS[input.registry.importStatus]
	}

	if (input.report?.status === 'failed') {
		return input.report.status
	}

	return null
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
	const failedStage = deriveFailedStage({ registry, report })
	const errorParts = [
		report?.processing_error ? `Error: ${report.processing_error}` : null,
		failedStage ? `Stage: ${failedStage}` : null,
		registry?.errorMessage && registry.errorMessage !== report?.processing_error
			? `Import: ${registry.errorMessage}`
			: null,
	].filter(Boolean)
	const reportId = report?.id ?? registry?.healthReportId ?? null

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
		errorLog: errorParts.length > 0 ? errorParts.join('\n') : null,
		sortDate:
			report?.report_date ??
			report?.uploaded_at ??
			registry?.importedAt ??
			registry?.lastSyncAt ??
			'',
		canReimport:
			status === 'failed' && Boolean(registry?.id ?? report?.id ?? null),
		canReprocess:
			Boolean(reportId) && status !== 'processing' && status !== 'skipped',
		canReprocessWithAi: report ? reportEligibleForAiReprocess(report) : false,
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
		const report = record.healthReportId
			? (reportById.get(record.healthReportId) ?? null)
			: null

		if (report) {
			linkedReportIds.add(report.id)
		}

		rows.push(buildRowModel({ registry: record, report }))
	}

	for (const report of input.reports) {
		if (linkedReportIds.has(report.id)) {
			continue
		}

		rows.push(buildRowModel({ registry: null, report }))
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
	if (filter === 'all') {
		return rows
	}

	if (filter === 'ready') {
		return rows.filter((row) => row.status === 'ready')
	}

	return rows.filter(
		(row) =>
			row.status === 'failed' ||
			row.status === 'needs_reprocess' ||
			row.status === 'skipped',
	)
}

export function countSetupRowsByFilter(rows: SetupReportRowModel[]): {
	all: number
	needsAttention: number
	ready: number
	failed: number
} {
	const needsAttention = rows.filter(
		(row) =>
			row.status === 'failed' ||
			row.status === 'needs_reprocess' ||
			row.status === 'skipped',
	).length

	return {
		all: rows.length,
		needsAttention,
		ready: rows.filter((row) => row.status === 'ready').length,
		failed: rows.filter((row) => row.status === 'failed').length,
	}
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
