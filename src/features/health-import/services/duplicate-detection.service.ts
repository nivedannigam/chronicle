import type {
	ConnectorDiscoveryItem,
	ConnectorDocumentRecord,
} from '@/core/connectors'
import {
	findRegistryByExternalFileId,
	updateRegistryRecord,
} from '@/features/connectors/services/connector-store.service'
import type { DuplicateReason } from '@/features/health-import/types/health-import.types'

export interface DuplicateCheckResult {
	isDuplicate: boolean
	reason?: DuplicateReason
	existing?: ConnectorDocumentRecord
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
		if (
			existing.importStatus === 'completed' &&
			existing.checksum === item.checksum
		) {
			return { isDuplicate: true, reason: 'same_checksum', existing }
		}

		return { isDuplicate: false, existing }
	}

	if (existing.importStatus === 'completed') {
		if (existing.checksum === item.checksum) {
			return { isDuplicate: true, reason: 'same_checksum', existing }
		}

		if (
			existing.externalFileId === item.externalFileId &&
			existing.fileSize === item.fileSize &&
			existing.checksum === item.checksum
		) {
			return { isDuplicate: true, reason: 'same_file_id', existing }
		}
	}

	return { isDuplicate: false, existing }
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
