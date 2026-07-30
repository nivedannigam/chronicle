/** Cross-domain platform event catalogue (Phase 6). */

export type JobStageEventType =
	| 'job.download_completed'
	| 'job.ocr_completed'
	| 'job.parse_completed'
	| 'job.index_completed'
	| 'job.failed'

export type ImportEventType =
	| 'import.started'
	| 'import.completed'
	| 'import.failed'
	| 'import.cancelled'
	| 'import.retry_started'
	| 'import.retry_completed'

export interface JobStageEvent {
	id: string
	type: JobStageEventType
	userId: string
	workflowItemId?: string
	registryId?: string
	reportId?: string
	stage: string
	message?: string
	payload?: Record<string, unknown>
	timestamp: string
}

export interface ImportEvent {
	id: string
	type: ImportEventType
	userId: string
	message: string
	payload?: Record<string, unknown>
	timestamp: string
}
