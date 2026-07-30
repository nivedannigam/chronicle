import type {
	BatchJobItem,
	JobBatchResult,
	JobContext,
	JobHandler,
	JobResult,
	RunJobBatchOptions,
} from './job.types.ts'
import {
	DEFAULT_JOB_BATCH_PARALLEL,
	DEFAULT_JOB_MAX_ATTEMPTS,
} from './job.types.ts'

function toError(value: unknown): Error {
	return value instanceof Error ? value : new Error(String(value))
}

export async function runJobWithRetry<TInput, TOutput>(
	handler: JobHandler<TInput, TOutput>,
	input: TInput,
	context: Omit<JobContext, 'attempt'> & { maxAttempts?: number },
): Promise<JobResult<TOutput>> {
	const maxAttempts = context.maxAttempts ?? DEFAULT_JOB_MAX_ATTEMPTS
	let lastResult: JobResult<TOutput> | null = null

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		if (context.isCancelled?.()) {
			return { status: 'cancelled' }
		}

		const result = await handler(input, {
			...context,
			attempt,
			maxAttempts,
		})

		if (result.status === 'completed' || result.status === 'cancelled') {
			return result
		}

		lastResult = result

		if (!result.retryable || attempt >= maxAttempts) {
			return result
		}
	}

	return (
		lastResult ?? {
			status: 'failed',
			error: new Error('Job failed without a result'),
			retryable: false,
		}
	)
}

export async function runJobBatch<TInput, TOutput>(
	items: BatchJobItem<TInput, TOutput>[],
	options: RunJobBatchOptions = {},
): Promise<JobBatchResult> {
	const parallel = options.parallel ?? DEFAULT_JOB_BATCH_PARALLEL
	const maxAttempts = options.maxAttempts ?? DEFAULT_JOB_MAX_ATTEMPTS
	const result: JobBatchResult = {
		completed: 0,
		failed: 0,
		cancelled: 0,
	}

	for (let index = 0; index < items.length; index += parallel) {
		if (options.isCancelled?.()) {
			result.cancelled += items.length - index
			break
		}

		const chunk = items.slice(index, index + parallel)

		const settled = await Promise.allSettled(
			chunk.map(async (item) => {
				await options.onItemStart?.(item.id)

				const jobResult = await runJobWithRetry(item.handler, item.input, {
					jobId: item.id,
					jobType: item.jobType ?? 'download',
					userId: item.userId ?? 'unknown',
					worker: item.worker,
					maxAttempts,
					isCancelled: options.isCancelled,
				})

				if (jobResult.status === 'completed') {
					await options.onItemComplete?.(item.id, jobResult)
					return 'completed' as const
				}

				if (jobResult.status === 'cancelled') {
					return 'cancelled' as const
				}

				await options.onItemError?.(
					item.id,
					jobResult.error ?? new Error('Job failed'),
				)

				return 'failed' as const
			}),
		)

		for (const entry of settled) {
			if (entry.status === 'fulfilled') {
				if (entry.value === 'completed') {
					result.completed += 1
				} else if (entry.value === 'cancelled') {
					result.cancelled += 1
				} else {
					result.failed += 1
				}
			} else {
				result.failed += 1
			}
		}

		await options.onBatchProgress?.()
	}

	return result
}

export function createJobHandler<TInput, TOutput>(
	jobType: JobContext['jobType'],
	fn: (input: TInput, context: JobContext) => Promise<TOutput>,
): JobHandler<TInput, TOutput> {
	return async (input, context) => {
		try {
			if (context.isCancelled?.()) {
				return { status: 'cancelled' }
			}

			const data = await fn(input, { ...context, jobType })
			return { status: 'completed', data }
		} catch (error) {
			return {
				status: 'failed',
				error: toError(error),
				retryable: false,
			}
		}
	}
}
