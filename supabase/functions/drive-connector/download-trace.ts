export type DriveDownloadStep =
	| 'resolve_access_token'
	| 'fetch_file_metadata'
	| 'download_file_bytes'
	| 'validate_mime_type'
	| 'storage_upload'
	| 'return_storage_path'

export interface DriveDownloadStepRecord {
	step: DriveDownloadStep
	label: string
	success: boolean
	durationMs: number
	error: string | null
	stack: string | null
}

export interface DriveDownloadTraceContext {
	requestId: string
	userId: string
	registryId: string | null
	workflowId: string | null
	reportId: string | null
	externalFileId: string
	fileName: string
}

export interface DriveDownloadFailure {
	success: false
	error: string
	failedStep: DriveDownloadStep
	failedStepLabel: string
	requestId: string
	registryId: string | null
	workflowId: string | null
	reportId: string | null
	stack: string | null
	steps: DriveDownloadStepRecord[]
	durationMs: number
}

export interface DriveDownloadSuccess {
	success: true
	storagePath: string
	fileSize: number
	sha256Checksum: string
	requestId: string
	registryId: string | null
	workflowId: string | null
	reportId: string | null
	steps: DriveDownloadStepRecord[]
	durationMs: number
}

export const DRIVE_DOWNLOAD_STEP_LABELS: Record<DriveDownloadStep, string> = {
	resolve_access_token: 'Resolve Google access token',
	fetch_file_metadata: 'Google Drive file metadata',
	download_file_bytes: 'Download file bytes',
	validate_mime_type: 'Validate MIME type',
	storage_upload: 'Storage upload',
	return_storage_path: 'Return storage path',
}

export function createRequestId(): string {
	return crypto.randomUUID()
}

export function logDownloadStep(input: {
	context: DriveDownloadTraceContext
	record: DriveDownloadStepRecord
}) {
	console.info(
		JSON.stringify({
			service: 'drive-connector',
			event: 'download_step',
			requestId: input.context.requestId,
			registryId: input.context.registryId,
			workflowId: input.context.workflowId,
			reportId: input.context.reportId,
			userId: input.context.userId,
			externalFileId: input.context.externalFileId,
			fileName: input.context.fileName,
			step: input.record.step,
			stepLabel: input.record.label,
			success: input.record.success,
			durationMs: input.record.durationMs,
			error: input.record.error,
			stack: input.record.stack,
		}),
	)
}

export async function runDownloadStep<T>(
	context: DriveDownloadTraceContext,
	step: DriveDownloadStep,
	run: () => Promise<T>,
): Promise<{ result: T; record: DriveDownloadStepRecord }> {
	const startedAt = Date.now()

	try {
		const result = await run()
		const record: DriveDownloadStepRecord = {
			step,
			label: DRIVE_DOWNLOAD_STEP_LABELS[step],
			success: true,
			durationMs: Date.now() - startedAt,
			error: null,
			stack: null,
		}

		logDownloadStep({ context, record })

		return { result, record }
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Drive download step failed'
		const stack = error instanceof Error ? (error.stack ?? null) : null
		const record: DriveDownloadStepRecord = {
			step,
			label: DRIVE_DOWNLOAD_STEP_LABELS[step],
			success: false,
			durationMs: Date.now() - startedAt,
			error: message,
			stack,
		}

		logDownloadStep({ context, record })

		throw Object.assign(error instanceof Error ? error : new Error(message), {
			failedStep: step,
			failedStepRecord: record,
		})
	}
}

export function buildDownloadFailure(input: {
	context: DriveDownloadTraceContext
	steps: DriveDownloadStepRecord[]
	error: unknown
	startedAt: number
}): DriveDownloadFailure {
	const failedStepRecord =
		(input.error as { failedStepRecord?: DriveDownloadStepRecord })
			.failedStepRecord ??
		[...input.steps].reverse().find((step) => !step.success) ??
		input.steps.at(-1)

	const failedStep = (failedStepRecord?.step ??
		'download_file_bytes') as DriveDownloadStep
	const message =
		input.error instanceof Error
			? input.error.message
			: 'Drive connector download failed'

	return {
		success: false,
		error: message,
		failedStep,
		failedStepLabel:
			failedStepRecord?.label ?? DRIVE_DOWNLOAD_STEP_LABELS[failedStep],
		requestId: input.context.requestId,
		registryId: input.context.registryId,
		workflowId: input.context.workflowId,
		reportId: input.context.reportId,
		stack: input.error instanceof Error ? (input.error.stack ?? null) : null,
		steps: input.steps,
		durationMs: Date.now() - input.startedAt,
	}
}

export { isDownloadMimeAllowed } from '../_shared/health-report-mime.ts'
