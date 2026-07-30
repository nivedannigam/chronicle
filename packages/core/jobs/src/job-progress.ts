import type { WorkflowProgress, WorkflowState } from '@chronicle/core-workflow'
import type { JobProgress } from './job.types.ts'

export function jobProgressToWorkflowProgress(
	progress: JobProgress,
): WorkflowProgress {
	return {
		label: progress.label,
		current: progress.current,
		total: progress.total,
		percent: progress.percent,
	}
}

export function workflowProgressToJobProgress(
	progress: WorkflowProgress,
): JobProgress {
	return {
		label: progress.label,
		current: progress.current,
		total: progress.total,
		percent: progress.percent,
	}
}

/** Map workflow states to canonical job types for logging and worker assignment. */
export function workflowStateToJobType(
	state: WorkflowState,
): import('./job.types.ts').JobType | null {
	switch (state) {
		case 'DOWNLOADING':
			return 'download'
		case 'IMPORTING':
			return 'download'
		case 'OCR':
		case 'PROCESSING':
		case 'OCR_COMPLETE':
			return 'ocr'
		case 'PARSING':
		case 'PARSED':
			return 'parser'
		case 'INDEXING':
			return 'search_index'
		default:
			return null
	}
}

export const JOB_TYPE_WORKERS: Record<
	import('./job.types.ts').JobType,
	string
> = {
	download: 'drive-connector',
	ocr: 'ocr-provider',
	parser: 'document-parser',
	metric_extraction: 'metric-extraction',
	embedding: 'embedding',
	ai_summary: 'ai-summary',
	search_index: 'search-index',
	notification: 'notification',
}
