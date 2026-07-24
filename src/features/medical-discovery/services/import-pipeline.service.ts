import { supabase } from '@/lib/supabase'
import { downloadDriveFile } from '@/features/connectors/google-drive/services/google-drive-api.service'
import {
	findRegistryByExternalFileId,
	listRegistryRecords,
	updateRegistryRecord,
} from '@/features/connectors/services/connector-store.service'
import { checkForDuplicate } from '@/features/health-import/services/duplicate-detection.service'
import {
	formatFileTooLargeError,
	HEALTH_REPORT_MAX_FILE_SIZE_BYTES,
	isFileTooLargeError,
} from '@/features/health-import/constants/import-limits'
import { processImportQueueWithProgress } from '@/features/health-import/services/health-import-runner.service'
import { listApprovedForImport } from '@/features/medical-discovery/services/import-review.service'
import type { ImportPipelineSummary } from '@/features/medical-discovery/types/medical-discovery.types'

function createEmptySummary(): ImportPipelineSummary {
	return {
		imported: 0,
		skipped: 0,
		duplicates: 0,
		errors: 0,
		lastError: null,
		errorSamples: [],
	}
}

function recordPipelineError(summary: ImportPipelineSummary, message: string) {
	summary.errors += 1
	summary.lastError ??= message

	if (
		!summary.errorSamples.includes(message) &&
		summary.errorSamples.length < 3
	) {
		summary.errorSamples.push(message)
	}
}

function enrichSummaryFromRegistry(
	summary: ImportPipelineSummary,
	failedRecords: Array<{ errorMessage: string | null }>,
) {
	if (failedRecords.length === 0) {
		return
	}

	summary.errors = Math.max(summary.errors, failedRecords.length)

	for (const record of failedRecords) {
		if (record.errorMessage) {
			summary.lastError ??= record.errorMessage

			if (
				!summary.errorSamples.includes(record.errorMessage) &&
				summary.errorSamples.length < 3
			) {
				summary.errorSamples.push(record.errorMessage)
			}
		}
	}
}

export async function resetFailedImportCandidates(
	userId: string,
): Promise<number> {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.select('id, error_message')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.eq('approval_status', 'approved')
		.eq('import_status', 'failed')

	if (error) {
		throw new Error(error.message)
	}

	const retryableIds = (data ?? [])
		.filter((row) => !isFileTooLargeError(row.error_message as string | null))
		.map((row) => row.id as string)

	if (retryableIds.length === 0) {
		return 0
	}

	const { error: updateError } = await supabase
		.from('connector_document_registry')
		.update({
			import_status: 'retry',
			error_message: null,
			updated_at: new Date().toISOString(),
		})
		.in('id', retryableIds)

	if (updateError) {
		throw new Error(updateError.message)
	}

	return retryableIds.length
}

export async function resetSkippedImportCandidates(
	userId: string,
): Promise<number> {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.update({
			import_status: 'discovered',
			error_message: null,
			updated_at: new Date().toISOString(),
		})
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.eq('approval_status', 'approved')
		.eq('import_status', 'skipped')
		.select('id')

	if (error) {
		throw new Error(error.message)
	}

	return data?.length ?? 0
}

export async function prepareImportCandidatesForQueue(
	userId: string,
): Promise<void> {
	await resetSkippedImportCandidates(userId)
	await resetFailedImportCandidates(userId)
}

export async function queueApprovedImports(
	userId: string,
): Promise<ImportPipelineSummary> {
	const approved = await listApprovedForImport(userId)
	const summary = createEmptySummary()

	for (const row of approved) {
		try {
			const fileSize = Number(row.file_size ?? 0)

			if (fileSize > HEALTH_REPORT_MAX_FILE_SIZE_BYTES) {
				const message = formatFileTooLargeError(
					row.file_name as string,
					fileSize,
				)

				await updateRegistryRecord(row.id as string, {
					importStatus: 'failed',
					errorMessage: message,
				})
				recordPipelineError(summary, message)
				continue
			}

			const duplicate = await checkForDuplicate({
				userId,
				excludeRegistryId: row.id as string,
				item: {
					externalFileId: row.external_file_id as string,
					fileName: row.file_name as string,
					mimeType: row.mime_type as string,
					fileSize: Number(row.file_size ?? 0),
					checksum: row.checksum as string,
					externalCreatedAt: (row.external_created_at as string) ?? '',
					externalModifiedAt: (row.external_modified_at as string) ?? '',
					folderExternalId: '',
				},
			})

			if (duplicate.isDuplicate && duplicate.existing) {
				await updateRegistryRecord(row.id as string, {
					importStatus: 'skipped',
					errorMessage: 'Duplicate file',
				})
				summary.duplicates += 1
				summary.skipped += 1
				continue
			}

			await updateRegistryRecord(row.id as string, {
				importStatus: 'queued',
				errorMessage: null,
			})
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Could not queue import'
			await updateRegistryRecord(row.id as string, {
				importStatus: 'failed',
				errorMessage: message.slice(0, 500),
			})
			recordPipelineError(summary, message)
		}
	}

	return summary
}

export async function processApprovedImports(
	userId: string,
	options: {
		parallel?: number
		onDocumentProgress?: () => void | Promise<void>
	} = {},
): Promise<ImportPipelineSummary> {
	await prepareImportCandidatesForQueue(userId)

	const summary = await queueApprovedImports(userId)

	try {
		const runResult = await processImportQueueWithProgress(userId, {
			parallel: options.parallel ?? 2,
			onDocumentProgress: options.onDocumentProgress,
		})
		summary.imported = runResult.importedThisRun
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Import queue failed'
		recordPipelineError(summary, message)
	}

	const registry = await listRegistryRecords(userId, 'google-drive')
	const failedRecords = registry.filter(
		(record) => record.importStatus === 'failed',
	)
	enrichSummaryFromRegistry(summary, failedRecords)

	return summary
}

export async function storeDownloadChecksum(
	userId: string,
	externalFileId: string,
	sha256Checksum: string,
) {
	const existing = await findRegistryByExternalFileId(
		userId,
		'google-drive',
		externalFileId,
	)

	if (!existing) {
		return
	}

	await supabase
		.from('connector_document_registry')
		.update({ sha256_checksum: sha256Checksum })
		.eq('id', existing.id)
}

export async function downloadAndChecksum(
	userId: string,
	externalFileId: string,
	fileName: string,
) {
	const result = await downloadDriveFile({ userId, externalFileId, fileName })

	if (result.sha256Checksum) {
		await storeDownloadChecksum(userId, externalFileId, result.sha256Checksum)
	}

	return result
}
