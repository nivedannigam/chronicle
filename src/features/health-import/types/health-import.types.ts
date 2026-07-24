import type {
	ConnectorDocumentRecord,
	ImportQueueStatus,
} from '@/core/connectors'

export type HealthImportWizardStep =
	'welcome' | 'discovery' | 'import' | 'processing' | 'completion'

export type HealthImportJobStatus =
	| 'idle'
	| 'discovering'
	| 'importing'
	| 'processing'
	| 'completed'
	| 'failed'
	| 'cancelled'

export type DuplicateReason = 'same_file_id' | 'same_checksum' | 'unchanged'

export interface HealthImportDiscoveryPreview {
	folderCount: number
	pdfCount: number
	skippedCount: number
	estimatedMinutes: number
	medicalCount: number
	reviewCount: number
	ignoredCount: number
}

export interface HealthImportDocumentProgress {
	registryId: string
	fileName: string
	status: ImportQueueStatus
	stageLabel: string
	startedAt: string
	elapsedMs: number
	errorMessage: string | null
}

export interface HealthImportSummary {
	reportsImported: number
	metricsExtracted: number
	yearsCovered: number
	timelineEvents: number
	categoriesCount: number
	firstReportDate: string | null
	latestReportDate: string | null
	skippedCount: number
	failedCount: number
	durationMs: number
}

export interface HealthImportJob {
	id: string
	userId: string
	status: HealthImportJobStatus
	startedAt: string
	completedAt: string | null
	discovery: HealthImportDiscoveryPreview | null
	summary: HealthImportSummary | null
	documents: HealthImportDocumentProgress[]
	errorMessage: string | null
}

export interface HealthImportHistoryEntry {
	id: string
	importDate: string
	durationMs: number
	reportsAdded: number
	reportsUpdated: number
	reportsSkipped: number
	reportsFailed: number
	status: 'completed' | 'partial' | 'failed' | 'cancelled'
}

export interface ImportNotification {
	id: string
	type: 'started' | 'complete' | 'failed' | 'retry_complete'
	message: string
	timestamp: string
}

export interface RegistryBucketCounts {
	imported: number
	skipped: number
	duplicate: number
	failed: number
	processing: number
	queued: number
}

export function bucketRegistryRecords(
	records: ConnectorDocumentRecord[],
): RegistryBucketCounts {
	return {
		imported: records.filter((r) => r.importStatus === 'completed').length,
		skipped: records.filter((r) => r.importStatus === 'skipped').length,
		duplicate: records.filter(
			(r) => r.importStatus === 'skipped' && r.registryStatus === 'discovered',
		).length,
		failed: records.filter((r) => r.importStatus === 'failed').length,
		processing: records.filter(
			(r) =>
				r.importStatus !== 'completed' &&
				r.importStatus !== 'failed' &&
				r.importStatus !== 'skipped' &&
				r.importStatus !== 'discovered',
		).length,
		queued: records.filter(
			(r) => r.importStatus === 'queued' || r.importStatus === 'discovered',
		).length,
	}
}

export function stageLabelForStatus(status: ImportQueueStatus): string {
	switch (status) {
		case 'downloading':
			return 'Downloading'
		case 'imported':
			return 'Imported'
		case 'ocr':
			return 'OCR'
		case 'parsing':
			return 'Parsing'
		case 'knowledge_graph':
			return 'Knowledge Graph'
		case 'completed':
			return 'Completed'
		case 'failed':
			return 'Failed'
		case 'skipped':
			return 'Skipped'
		case 'cancelled':
			return 'Cancelled'
		default:
			return 'Queued'
	}
}
