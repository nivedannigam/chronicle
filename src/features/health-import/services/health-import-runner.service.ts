import {
	formatFileTooLargeError,
	HEALTH_REPORT_MAX_FILE_SIZE_BYTES,
} from '@/features/health-import/constants/import-limits'
import type { ImportQueueRunResult } from '@/features/health-import/types/health-import-journey.types'
import type {
	ImportPhase,
	ImportRegistryOutcome,
} from '@/features/health-import/types/import-runner.types'
import { HEALTH_JOB_WORKERS } from '@/features/health/jobs/health-job.types'
import {
	createJobHandler,
	DEFAULT_JOB_BATCH_PARALLEL,
	runJobBatch,
} from '@chronicle/core-jobs'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { safeTransitionWorkflowItem } from '@/features/health/workflow/safe-workflow-transition'
import { advanceImportWorkflowToDownload } from '@/features/health/workflow/advance-import-workflow'
import { retryAllFailedWorkflowItems } from '@/features/health/workflow/health-workflow-retry.service'
import {
	completePipelineStage,
	failPipelineStage,
	startPipelineStage,
} from '@/features/health/pipeline/health-pipeline-logger'
import { buildWorkflowErrorDetail } from '@/core/workflow/workflow-errors.types'
import { EdgeFunctionInvokeError } from '@/lib/edge-function-invoke'
import {
	completeSyncRun,
	createSyncRun,
	enqueueImportItem,
	listRegistryRecords,
	updateConnectorLastSync,
	updateRegistryRecord,
	upsertConnectorConnection,
} from '@/features/connectors/services/connector-store.service'
import { downloadDriveFile } from '@/features/connectors/google-drive/services/google-drive-api.service'
import {
	runMedicalDiscovery,
	getLatestDiscoveryRun,
} from '@/features/medical-discovery/services/medical-discovery-engine.service'
import {
	enqueueHealthReportProcessing,
	processHealthReport,
} from '@/features/health/services/health-processing.service'
import { supabase } from '@/lib/supabase'
import type { ConnectorSyncMode } from '@/core/connectors'

const importStartTimes = new Map<string, number>()

function isHealthReportStatusConstraintError(
	error: { message?: string; code?: string } | null,
): boolean {
	if (!error?.message) {
		return false
	}

	return (
		error.message.includes('health_reports_status_check') ||
		error.code === '23514'
	)
}

function isHealthReportSchemaError(
	error: { message?: string } | null,
): boolean {
	if (!error?.message) {
		return false
	}

	return (
		isHealthReportStatusConstraintError(error) ||
		error.message.includes('does not exist') ||
		error.message.includes('column')
	)
}

export function getImportDebugTimings(): Array<{
	registryId: string
	elapsedMs: number
}> {
	const now = Date.now()

	return [...importStartTimes.entries()].map(([registryId, startedAt]) => ({
		registryId,
		elapsedMs: now - startedAt,
	}))
}

async function importRegistryRecord(
	userId: string,
	registryId: string,
	onImportPhase?: (phase: ImportPhase) => void,
): Promise<{ reportId: string; outcome: ImportRegistryOutcome }> {
	importStartTimes.set(registryId, Date.now())

	const { data: registry, error } = await supabase
		.from('connector_document_registry')
		.select('*')
		.eq('id', registryId)
		.single()

	if (error || !registry) {
		throw new Error(error?.message ?? 'Registry record not found')
	}

	if (registry.file_name.toLowerCase().includes('password')) {
		throw new Error('Password-protected PDFs are not supported')
	}

	const fileSize = Number(registry.file_size ?? 0)

	if (fileSize > HEALTH_REPORT_MAX_FILE_SIZE_BYTES) {
		const message = formatFileTooLargeError(
			registry.file_name as string,
			fileSize,
		)

		await updateRegistryRecord(registryId, {
			importStatus: 'failed',
			registryStatus: 'failed',
			errorMessage: message,
		})

		throw new Error(message)
	}

	onImportPhase?.('download')
	await updateRegistryRecord(registryId, { importStatus: 'downloading' })

	startPipelineStage({
		registryId,
		stage: 'DOWNLOADING',
		nextStage: 'OCR',
		details: {
			fileId: registry.external_file_id,
			fileName: registry.file_name,
		},
	})

	await advanceImportWorkflowToDownload({
		registryId,
		userId,
		familyMemberId: (registry.family_member_id as string | null) ?? null,
		worker: 'drive-connector',
	})

	let download

	try {
		download = await downloadDriveFile({
			userId,
			externalFileId: registry.external_file_id,
			fileName: registry.file_name,
			registryId,
			requestId: registryId,
		})
	} catch (error) {
		const errorDetail = buildWorkflowErrorDetail({
			stage: 'DOWNLOADING',
			error,
			edgeFunction: 'drive-connector',
			httpStatus:
				error instanceof EdgeFunctionInvokeError ? error.httpStatus : undefined,
			requestPayload:
				error instanceof EdgeFunctionInvokeError
					? error.requestPayload
					: undefined,
			responsePayload:
				error instanceof EdgeFunctionInvokeError
					? error.responsePayload
					: undefined,
		})

		failPipelineStage({
			registryId,
			stage: 'DOWNLOADING',
			error: errorDetail.message,
			details: {
				fileId: registry.external_file_id,
				fileName: registry.file_name,
			},
		})

		await updateRegistryRecord(registryId, {
			importStatus: 'failed',
			registryStatus: 'failed',
			errorMessage: errorDetail.userMessage.slice(0, 500),
		})

		await safeTransitionWorkflowItem({
			registryId,
			toState: 'FAILED',
			context: {
				userId,
				failureReason: errorDetail.userMessage,
				failedStage: 'DOWNLOADING',
				errorDetail,
				worker: 'drive-connector',
			},
		})

		throw error
	}

	completePipelineStage({
		registryId,
		stage: 'DOWNLOADING',
		nextStage: 'OCR',
		details: {
			fileId: registry.external_file_id,
			fileName: registry.file_name,
			downloadedSize: download.fileSize,
			storagePath: download.storagePath,
			checksum: download.sha256Checksum ?? null,
		},
	})

	if (download.sha256Checksum) {
		await supabase
			.from('connector_document_registry')
			.update({ sha256_checksum: download.sha256Checksum })
			.eq('id', registryId)
	}

	await updateRegistryRecord(registryId, {
		importStatus: 'imported',
		importedAt: new Date().toISOString(),
	})

	await safeTransitionWorkflowItem({
		registryId,
		toState: 'IMPORTING',
		context: {
			userId,
			progress: { label: 'Importing' },
		},
	})

	const reportPayload = {
		user_id: userId,
		file_name: registry.file_name,
		storage_path: download.storagePath,
		report_date: registry.external_modified_at
			? String(registry.external_modified_at).slice(0, 10)
			: new Date().toISOString().slice(0, 10),
		report_type: 'general',
		status: 'uploaded',
		source: 'google_drive',
		external_file_id: registry.external_file_id,
		external_modified_at: registry.external_modified_at,
		connector_id: 'google-drive',
		family_member_id: (registry.family_member_id as string | null) ?? null,
		...(download.sha256Checksum ? { file_hash: download.sha256Checksum } : {}),
	}

	const { data: existingReport } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.eq('external_file_id', registry.external_file_id)
		.maybeSingle()

	let report = existingReport as Record<string, unknown> | null
	let insertError: {
		message?: string
		details?: string
		hint?: string
		code?: string
	} | null = null

	if (report?.status === 'completed') {
		onImportPhase?.('ocr')
		onImportPhase?.('metrics')

		await updateRegistryRecord(registryId, {
			importStatus: 'completed',
			registryStatus: 'completed',
			healthReportId: report.id as string,
			knowledgeGraphStatus: 'indexed',
			errorMessage: null,
		})

		importStartTimes.delete(registryId)

		return { reportId: report.id as string, outcome: 'skipped_existing' }
	}

	if (!report) {
		const insertResult = await supabase
			.from('health_reports')
			.insert(reportPayload)
			.select('*')
			.single()

		report = insertResult.data as Record<string, unknown> | null
		insertError = insertResult.error
	} else {
		const updateResult = await supabase
			.from('health_reports')
			.update({
				...reportPayload,
				status: 'uploaded',
				processing_error: null,
			})
			.eq('id', report.id)
			.select('*')
			.single()

		report = updateResult.data as Record<string, unknown> | null
		insertError = updateResult.error
	}

	if (insertError && isHealthReportStatusConstraintError(insertError)) {
		if (import.meta.env.DEV) {
			console.warn(
				'health_reports insert failed status constraint; retrying with status queued',
				insertError.message,
			)
		}

		if (existingReport) {
			const retry = await supabase
				.from('health_reports')
				.update({ ...reportPayload, status: 'queued', processing_error: null })
				.eq('id', existingReport.id)
				.select('*')
				.single()

			report = retry.data as Record<string, unknown> | null
			insertError = retry.error
		} else {
			const retry = await supabase
				.from('health_reports')
				.insert({ ...reportPayload, status: 'queued' })
				.select('*')
				.single()

			report = retry.data as Record<string, unknown> | null
			insertError = retry.error
		}
	}

	if (insertError || !report) {
		const detail = insertError?.details ? ` (${insertError.details})` : ''
		const hint = insertError?.hint ? ` Hint: ${insertError.hint}` : ''
		let message = `${insertError?.message ?? 'Could not create health report'}${detail}${hint}`

		if (isHealthReportSchemaError(insertError)) {
			message +=
				' — Database schema may be outdated. Apply health report migrations (see CONNECTOR_DB_SETUP.md).'
		}

		const errorDetail = buildWorkflowErrorDetail({
			stage: 'IMPORTING',
			error: new Error(message),
		})

		await updateRegistryRecord(registryId, {
			importStatus: 'failed',
			registryStatus: 'failed',
			errorMessage: errorDetail.userMessage.slice(0, 500),
		})

		await safeTransitionWorkflowItem({
			registryId,
			toState: 'FAILED',
			context: {
				userId,
				failureReason: errorDetail.userMessage,
				failedStage: 'IMPORTING',
				errorDetail,
			},
		})

		throw new Error(message)
	}

	await updateRegistryRecord(registryId, {
		importStatus: 'ocr',
		registryStatus: 'processing',
		healthReportId: report.id as string,
	})
	onImportPhase?.('ocr')

	await safeTransitionWorkflowItem({
		registryId,
		toState: 'OCR',
		context: {
			userId,
			reportId: report.id as string,
			familyMemberId: (registry.family_member_id as string | null) ?? null,
			progress: { label: 'Running OCR' },
		},
	})

	await enqueueHealthReportProcessing(userId, report.id as string)
	await updateRegistryRecord(registryId, { importStatus: 'parsing' })
	onImportPhase?.('metrics')

	const processed = await processHealthReport(report.id as string)

	await updateRegistryRecord(registryId, {
		importStatus:
			processed.status === 'completed' ? 'knowledge_graph' : 'failed',
		errorMessage: processed.processing_error,
	})

	if (processed.status === 'completed') {
		invalidateHealthKnowledgeCache(userId)

		await updateRegistryRecord(registryId, {
			importStatus: 'completed',
			registryStatus: 'completed',
			knowledgeGraphStatus: 'indexed',
		})
	} else {
		await updateRegistryRecord(registryId, {
			importStatus: 'failed',
			registryStatus: 'failed',
			errorMessage: processed.processing_error ?? 'Processing failed',
		})

		await safeTransitionWorkflowItem({
			registryId,
			toState: 'FAILED',
			context: {
				userId,
				reportId: report.id as string,
				failureReason: processed.processing_error ?? 'Processing failed',
			},
		})
	}

	importStartTimes.delete(registryId)

	return { reportId: report.id as string, outcome: 'imported' }
}

export async function processImportQueueWithProgress(
	userId: string,
	options: {
		limit?: number
		parallel?: number
		retryFailedOnly?: boolean
		onDocumentProgress?: () => void | Promise<void>
		onImportPhase?: (phase: ImportPhase) => void
		isCancelled?: () => boolean
	} = {},
): Promise<ImportQueueRunResult> {
	const registry = await listRegistryRecords(userId, 'google-drive')
	const pending = registry.filter((record) => {
		if (options.retryFailedOnly) {
			return record.importStatus === 'retry' || record.importStatus === 'failed'
		}

		return record.importStatus === 'queued' || record.importStatus === 'retry'
	})

	const batch = pending.slice(0, options.limit ?? pending.length)
	const runResult: ImportQueueRunResult = {
		importedThisRun: 0,
		failedThisRun: 0,
		skippedThisRun: 0,
	}

	const downloadImportHandler = createJobHandler(
		'download',
		async (input: {
			userId: string
			registryId: string
			onImportPhase?: (phase: ImportPhase) => void
		}) => {
			await enqueueImportItem({
				userId: input.userId,
				connectorId: 'google-drive',
				registryId: input.registryId,
			})

			return importRegistryRecord(
				input.userId,
				input.registryId,
				input.onImportPhase,
			)
		},
	)

	await runJobBatch(
		batch.map((record) => ({
			id: record.id,
			userId,
			jobType: 'download' as const,
			worker: HEALTH_JOB_WORKERS.download,
			input: {
				userId,
				registryId: record.id,
				onImportPhase: options.onImportPhase,
			},
			handler: downloadImportHandler,
		})),
		{
			parallel: options.parallel ?? DEFAULT_JOB_BATCH_PARALLEL,
			isCancelled: options.isCancelled,
			onBatchProgress: options.onDocumentProgress,
			onItemComplete: (_id, result) => {
				const payload = result.data as
					{ outcome: ImportRegistryOutcome } | undefined

				if (payload?.outcome === 'imported') {
					runResult.importedThisRun += 1
				} else {
					runResult.skippedThisRun += 1
				}
			},
			onItemError: async (registryId, error) => {
				runResult.failedThisRun += 1

				const errorDetail = buildWorkflowErrorDetail({
					stage: 'DOWNLOADING',
					error,
					edgeFunction: 'drive-connector',
					httpStatus:
						error instanceof EdgeFunctionInvokeError
							? error.httpStatus
							: undefined,
				})

				await updateRegistryRecord(registryId, {
					importStatus: 'failed',
					registryStatus: 'failed',
					errorMessage: errorDetail.userMessage.slice(0, 500),
				})

				await safeTransitionWorkflowItem({
					registryId,
					toState: 'FAILED',
					context: {
						userId,
						failureReason: errorDetail.userMessage,
						failedStage: 'DOWNLOADING',
						errorDetail,
						worker: 'drive-connector',
					},
				})
			},
		},
	)

	invalidateAfterHealthImport(userId)

	return runResult
}

export async function runHealthImportSync(input: {
	userId: string
	mode: ConnectorSyncMode
	onProgress?: () => void | Promise<void>
}): Promise<void> {
	const syncRun = await createSyncRun({
		userId: input.userId,
		connectorId: 'google-drive',
		mode: input.mode,
	})

	let filesDiscovered = 0
	let filesQueued = 0

	try {
		const lastRun =
			input.mode === 'incremental'
				? await getLatestDiscoveryRun(input.userId)
				: null
		const modifiedSince = lastRun?.completedAt ?? lastRun?.startedAt ?? null

		const { files } = await runMedicalDiscovery({
			userId: input.userId,
			mode: input.mode === 'incremental' ? 'incremental' : 'manual',
			modifiedSince,
		})

		filesDiscovered = files.length
		filesQueued = files.filter((file) => file.category !== 'ignored').length

		await input.onProgress?.()

		await updateConnectorLastSync(input.userId, 'google-drive')
		await upsertConnectorConnection({
			userId: input.userId,
			connectorId: 'google-drive',
			status: 'connected',
		})

		await completeSyncRun(syncRun.id, {
			status: 'completed',
			filesDiscovered,
			filesQueued: 0,
			filesImported: 0,
			filesFailed: 0,
		})
	} catch (error) {
		await completeSyncRun(syncRun.id, {
			status: 'failed',
			filesDiscovered,
			filesQueued,
			filesImported: 0,
			filesFailed: 0,
			errorMessage: error instanceof Error ? error.message : 'Sync failed',
		})

		throw error
	}
}

// Re-export for backward compatibility with google-drive-sync.service consumers
export { importRegistryRecord }

export async function runGoogleDriveSync(input: {
	userId: string
	mode: ConnectorSyncMode
}): Promise<void> {
	return runHealthImportSync(input)
}

export async function retryFailedImports(userId: string): Promise<number> {
	const result = await retryAllFailedWorkflowItems(userId)
	return result.retried
}

export async function resetGoogleDriveConnector(userId: string): Promise<void> {
	await supabase
		.from('connector_import_queue')
		.delete()
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
	await supabase
		.from('connector_document_registry')
		.delete()
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
	await supabase
		.from('connector_folders')
		.delete()
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
	await supabase
		.from('connector_sync_runs')
		.delete()
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')

	await upsertConnectorConnection({
		userId,
		connectorId: 'google-drive',
		status: 'disconnected',
	})
}
