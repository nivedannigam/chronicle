/** Canonical platform job types — map to workflow stages in domain adapters. */
export type JobType =
	| 'download'
	| 'ocr'
	| 'parser'
	| 'metric_extraction'
	| 'embedding'
	| 'ai_summary'
	| 'search_index'
	| 'notification'

export type JobStatus =
	'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retry'

export interface JobProgress {
	label: string
	current?: number
	total?: number
	percent?: number
}

export interface JobContext {
	jobId: string
	jobType: JobType
	userId: string
	worker?: string
	attempt: number
	maxAttempts: number
	metadata?: Record<string, unknown>
	isCancelled?: () => boolean
	onProgress?: (progress: JobProgress) => void | Promise<void>
}

export interface JobResult<T = unknown> {
	status: 'completed' | 'failed' | 'cancelled'
	data?: T
	error?: Error
	retryable?: boolean
}

export type JobHandler<TInput, TOutput> = (
	input: TInput,
	context: JobContext,
) => Promise<JobResult<TOutput>>

export interface BatchJobItem<TInput, TOutput> {
	id: string
	input: TInput
	handler: JobHandler<TInput, TOutput>
	jobType?: JobType
	userId?: string
	worker?: string
}

export interface RunJobBatchOptions {
	parallel?: number
	maxAttempts?: number
	isCancelled?: () => boolean
	onItemStart?: (id: string) => void | Promise<void>
	onItemComplete?: (id: string, result: JobResult) => void | Promise<void>
	onItemError?: (id: string, error: unknown) => void | Promise<void>
	onBatchProgress?: () => void | Promise<void>
}

export interface JobBatchResult {
	completed: number
	failed: number
	cancelled: number
}

export const DEFAULT_JOB_MAX_ATTEMPTS = 1
export const DEFAULT_JOB_BATCH_PARALLEL = 3
