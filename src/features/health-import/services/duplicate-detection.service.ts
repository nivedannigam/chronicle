import type {
	ConnectorDiscoveryItem,
	ConnectorDocumentRecord,
} from '@/core/connectors'
import {
	findRegistryByExternalFileId,
	updateRegistryRecord,
} from '@/features/connectors/services/connector-store.service'
import type { DuplicateReason } from '@/features/health-import/types/health-import.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { supabase } from '@/lib/supabase'

export interface DuplicateCheckResult {
	isDuplicate: boolean
	reason?: DuplicateReason
	existing?: ConnectorDocumentRecord
	existingReportId?: string
}

export class DuplicateHealthReportError extends Error {
	existingReportId: string

	constructor(message: string, existingReportId: string) {
		super(message)
		this.name = 'DuplicateHealthReportError'
		this.existingReportId = existingReportId
	}
}

const PRESERVED_IMPORT_STATUSES = new Set([
	'completed',
	'downloading',
	'imported',
	'ocr',
	'parsing',
	'knowledge_graph',
	'queued',
])

const IN_PROGRESS_REPORT_STATUSES = new Set([
	'uploaded',
	'queued',
	'processing',
	'parsed',
])

function duplicateMessage(reason: DuplicateReason): string {
	switch (reason) {
		case 'unchanged':
			return 'Already imported — file unchanged on Drive'
		case 'same_checksum':
			return 'Duplicate file — already imported'
		case 'same_file_id':
			return 'Duplicate file — same Drive document already imported'
	}
}

function isUnchangedOnDrive(
	existing: ConnectorDocumentRecord,
	item: ConnectorDiscoveryItem,
): boolean {
	return (
		existing.externalFileId === item.externalFileId &&
		existing.checksum === item.checksum &&
		existing.externalModifiedAt === item.externalModifiedAt &&
		existing.fileSize === item.fileSize
	)
}

async function findCompletedHealthReportByExternalFileId(
	userId: string,
	externalFileId: string,
): Promise<UploadedHealthReport | null> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.eq('external_file_id', externalFileId)
		.eq('status', 'completed')
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return (data as UploadedHealthReport | null) ?? null
}

function resolveRegistryDuplicate(
	existing: ConnectorDocumentRecord,
	item: ConnectorDiscoveryItem,
): DuplicateCheckResult | null {
	if (existing.importStatus === 'completed') {
		if (isUnchangedOnDrive(existing, item)) {
			return {
				isDuplicate: true,
				reason: 'unchanged',
				existing,
				existingReportId: existing.healthReportId ?? undefined,
			}
		}

		if (existing.checksum === item.checksum) {
			return {
				isDuplicate: true,
				reason: 'same_checksum',
				existing,
				existingReportId: existing.healthReportId ?? undefined,
			}
		}

		if (
			existing.externalFileId === item.externalFileId &&
			existing.fileSize === item.fileSize
		) {
			return {
				isDuplicate: true,
				reason: 'same_file_id',
				existing,
				existingReportId: existing.healthReportId ?? undefined,
			}
		}
	}

	if (
		existing.importStatus === 'skipped' &&
		isUnchangedOnDrive(existing, item)
	) {
		return {
			isDuplicate: true,
			reason: 'unchanged',
			existing,
			existingReportId: existing.healthReportId ?? undefined,
		}
	}

	return null
}

export async function checkDiscoveryDuplicate(input: {
	userId: string
	item: ConnectorDiscoveryItem
}): Promise<DuplicateCheckResult> {
	const existing = await findRegistryByExternalFileId(
		input.userId,
		'google-drive',
		input.item.externalFileId,
	)

	const completedReport = await findCompletedHealthReportByExternalFileId(
		input.userId,
		input.item.externalFileId,
	)

	if (completedReport) {
		const reportModified = completedReport.external_modified_at
		const driveModified = input.item.externalModifiedAt

		if (
			reportModified &&
			driveModified &&
			reportModified === driveModified &&
			existing &&
			isUnchangedOnDrive(existing, input.item)
		) {
			return {
				isDuplicate: true,
				reason: 'unchanged',
				existing,
				existingReportId: completedReport.id,
			}
		}

		if (existing) {
			const registryDuplicate = resolveRegistryDuplicate(existing, input.item)

			if (registryDuplicate) {
				return registryDuplicate
			}
		}

		if (
			existing?.checksum === input.item.checksum ||
			(!existing && reportModified === driveModified)
		) {
			return {
				isDuplicate: true,
				reason: 'unchanged',
				existing: existing ?? undefined,
				existingReportId: completedReport.id,
			}
		}
	}

	if (existing) {
		const registryDuplicate = resolveRegistryDuplicate(existing, input.item)

		if (registryDuplicate) {
			return registryDuplicate
		}
	}

	return { isDuplicate: false, existing: existing ?? undefined }
}

export async function checkForDuplicate(input: {
	userId: string
	item: ConnectorDiscoveryItem
	excludeRegistryId?: string
}): Promise<DuplicateCheckResult> {
	const { userId, item, excludeRegistryId } = input

	const existing = await findRegistryByExternalFileId(
		userId,
		'google-drive',
		item.externalFileId,
	)

	if (!existing) {
		return { isDuplicate: false }
	}

	if (excludeRegistryId && existing.id === excludeRegistryId) {
		const registryDuplicate = resolveRegistryDuplicate(existing, item)

		if (registryDuplicate?.reason === 'same_checksum') {
			return registryDuplicate
		}

		return { isDuplicate: false, existing }
	}

	const registryDuplicate = resolveRegistryDuplicate(existing, item)

	if (registryDuplicate) {
		return registryDuplicate
	}

	return { isDuplicate: false, existing }
}

export async function checkForDuplicateManualUpload(input: {
	userId: string
	fileHash: string
	familyMemberId?: string | null
}): Promise<{
	isDuplicate: boolean
	existingReport?: UploadedHealthReport
}> {
	let query = supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', input.userId)
		.eq('file_hash', input.fileHash)
		.order('uploaded_at', { ascending: false })
		.limit(5)

	if (input.familyMemberId) {
		query = query.eq('family_member_id', input.familyMemberId)
	} else {
		query = query.is('family_member_id', null)
	}

	const { data, error } = await query

	if (error) {
		throw new Error(error.message)
	}

	const rows = (data ?? []) as UploadedHealthReport[]
	const completed = rows.find((row) => row.status === 'completed')

	if (completed) {
		return { isDuplicate: true, existingReport: completed }
	}

	const inProgress = rows.find((row) =>
		IN_PROGRESS_REPORT_STATUSES.has(row.status),
	)

	if (inProgress) {
		return { isDuplicate: true, existingReport: inProgress }
	}

	return { isDuplicate: false }
}

export function shouldPreserveImportStatus(
	importStatus: string | null | undefined,
): boolean {
	return Boolean(importStatus && PRESERVED_IMPORT_STATUSES.has(importStatus))
}

export async function markRegistrySkipped(
	registryId: string,
	reason: string,
): Promise<void> {
	await updateRegistryRecord(registryId, {
		importStatus: 'skipped',
		errorMessage: reason,
	})
}

export function duplicateSkipMessage(reason: DuplicateReason): string {
	return duplicateMessage(reason)
}
