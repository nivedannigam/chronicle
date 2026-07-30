import {
	normalizeLegacyWorkflowState,
	type WorkflowState,
} from '@chronicle/core-workflow'

/** Map a failed workflow stage to the correct retry entry point. */
export function getRetryTargetState(
	failedStage: WorkflowState | null | undefined,
): WorkflowState {
	const stage = normalizeLegacyWorkflowState(failedStage ?? 'FAILED')

	switch (stage) {
		case 'DOWNLOADING':
			return 'DOWNLOADING'
		case 'IMPORTING':
			return 'IMPORTING'
		case 'OCR':
		case 'PROCESSING':
		case 'OCR_COMPLETE':
			return 'OCR'
		case 'PARSING':
		case 'PARSED':
			return 'PARSING'
		case 'INDEXING':
			return 'INDEXING'
		case 'QUEUED':
			return 'QUEUED'
		default:
			return 'QUEUED'
	}
}

export function retryRegistryImportStatus(
	targetState: WorkflowState,
): 'retry' | 'queued' | 'downloading' | 'ocr' | 'parsing' | 'knowledge_graph' {
	switch (targetState) {
		case 'DOWNLOADING':
		case 'IMPORTING':
			return 'downloading'
		case 'OCR':
		case 'PROCESSING':
			return 'ocr'
		case 'PARSING':
			return 'parsing'
		case 'INDEXING':
			return 'knowledge_graph'
		default:
			return 'retry'
	}
}

export function shouldReprocessReport(targetState: WorkflowState): boolean {
	return (
		targetState === 'OCR' ||
		targetState === 'PARSING' ||
		targetState === 'INDEXING' ||
		targetState === 'PROCESSING'
	)
}

export function shouldRedownload(targetState: WorkflowState): boolean {
	return targetState === 'DOWNLOADING' || targetState === 'IMPORTING'
}

export interface JobRetryPolicy {
	maxAttempts: number
	retryable: boolean
}

export function defaultJobRetryPolicy(
	attempt: number,
	maxAttempts: number,
): JobRetryPolicy {
	return {
		maxAttempts,
		retryable: attempt < maxAttempts,
	}
}
