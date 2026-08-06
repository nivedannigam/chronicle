import type { UploadedHealthReport } from '@/features/health/types'

const inFlightByReportId = new Map<string, Promise<UploadedHealthReport>>()

export function isHealthReportProcessingLocked(reportId: string): boolean {
	return inFlightByReportId.has(reportId)
}

export function getInFlightHealthReportProcessing(
	reportId: string,
): Promise<UploadedHealthReport> | undefined {
	return inFlightByReportId.get(reportId)
}

function formatProcessingError(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	if (typeof error === 'string') {
		return error
	}

	try {
		return JSON.stringify(error)
	} catch {
		return String(error)
	}
}

/**
 * Ensures only one import/reprocess pipeline runs per report at a time.
 * Non-force callers join the in-flight promise instead of starting a duplicate run.
 */
export async function withHealthReportProcessingLock<T>(
	reportId: string,
	run: () => Promise<T>,
	options: { force?: boolean } = {},
): Promise<T> {
	const existing = inFlightByReportId.get(reportId)

	if (existing && !options.force) {
		if (import.meta.env.DEV) {
			console.info(
				JSON.stringify({
					service: 'health-processing',
					event: 'processing_skipped_duplicate',
					reportId,
				}),
			)
		}

		return existing as Promise<T>
	}

	if (existing && options.force) {
		await existing.catch(() => {
			// Prior run failed — continue with forced reprocess.
		})
	}

	const promise = run().catch((error) => {
		if (import.meta.env.DEV) {
			console.warn(
				JSON.stringify({
					service: 'health-processing',
					event: 'processing_failed',
					reportId,
					error: formatProcessingError(error),
				}),
			)
		}

		throw error
	})

	inFlightByReportId.set(reportId, promise as Promise<UploadedHealthReport>)

	try {
		return await promise
	} finally {
		if (inFlightByReportId.get(reportId) === promise) {
			inFlightByReportId.delete(reportId)
		}
	}
}
