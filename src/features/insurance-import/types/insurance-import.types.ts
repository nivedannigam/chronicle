export type InsuranceImportStatus =
	| 'discovered'
	| 'queued'
	| 'downloading'
	| 'processing'
	| 'completed'
	| 'failed'
	| 'skipped'

export interface InsuranceDiscoveryRunSummary {
	id: string
	status: 'running' | 'completed' | 'failed'
	startedAt: string
	completedAt: string | null
	foldersScanned: number
	filesScanned: number
	documentCount: number
	duplicateCount: number
	errorMessage: string | null
}

export interface InsuranceImportStatusSnapshot {
	isScanning: boolean
	processingCount: number
	completedDocumentCount: number
	failedCount: number
	lastRun: InsuranceDiscoveryRunSummary | null
}
