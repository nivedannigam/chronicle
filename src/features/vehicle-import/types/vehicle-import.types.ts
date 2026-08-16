export type VehicleDiscoveryRunStatus = 'running' | 'completed' | 'failed'

export interface VehicleDiscoveryRunSummary {
	id: string
	status: VehicleDiscoveryRunStatus
	startedAt: string
	completedAt: string | null
	foldersScanned: number
	filesScanned: number
	documentCount: number
	duplicateCount: number
	errorMessage: string | null
}

export interface VehicleImportStatusSnapshot {
	isScanning: boolean
	processingCount: number
	completedDocumentCount: number
	failedCount: number
	lastRun: VehicleDiscoveryRunSummary | null
}
