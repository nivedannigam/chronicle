import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { downloadDriveFile } from '@/features/connectors/google-drive/services/google-drive-api.service'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'
import {
	connectorRecordToDocumentInput,
	isImportableConnectorDocument,
} from '@/features/documents/services/document-import.service'
import {
	createDocumentRecord,
	updateDocumentRecord,
} from '@/features/documents/services/document.service'
import { buildFinanceDocumentLink } from '@/features/finance-knowledge/services/finance-document-linking.service'
import {
	processFinanceDocument,
	processPendingFinanceDocuments,
	shouldProcessFinanceDocument,
} from '@/features/finance-import/services/finance-processing.service'
import { listFinanceSourceAssignments } from '@/features/finance/services/finance-sources.service'
import { supabase } from '@/lib/supabase'

function readMetadataString(
	metadata: Record<string, unknown>,
	key: string,
): string | null {
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function findExistingFinanceDocument(input: {
	userId: string
	externalFileId: string
}): Promise<{
	id: string
	file_name: string
	mime_type: string
	sub_category_id: string | null
	extracted_metadata: Record<string, unknown>
	extracted_text: string | null
	external_file_id: string | null
	connector_registry_id: string | null
	storage_path: string
} | null> {
	const { data } = await supabase
		.from('chronicle_documents')
		.select(
			'id, file_name, mime_type, sub_category_id, extracted_metadata, extracted_text, external_file_id, connector_registry_id, storage_path',
		)
		.eq('user_id', input.userId)
		.eq('external_file_id', input.externalFileId)
		.maybeSingle()

	if (!data?.id) {
		return null
	}

	return {
		id: String(data.id),
		file_name: String(data.file_name),
		mime_type: String(data.mime_type ?? 'application/pdf'),
		sub_category_id: (data.sub_category_id as string | null) ?? null,
		extracted_metadata:
			(data.extracted_metadata as Record<string, unknown> | null) ?? {},
		extracted_text: (data.extracted_text as string | null) ?? null,
		external_file_id: (data.external_file_id as string | null) ?? null,
		connector_registry_id:
			(data.connector_registry_id as string | null) ?? null,
		storage_path: String(data.storage_path ?? ''),
	}
}

async function applyFinanceDocumentLink(input: {
	documentId: string
	fileName: string
	folderPath: string | null
	mimeType: string
	subCategoryId?: string | null
	extractedMetadata?: Record<string, unknown>
	extractedText?: string | null
}): Promise<void> {
	const link = buildFinanceDocumentLink({
		documentId: input.documentId,
		fileName: input.fileName,
		folderPath: input.folderPath,
		mimeType: input.mimeType,
		subCategoryId: input.subCategoryId ?? null,
		extractedMetadata: input.extractedMetadata ?? {},
		extractedText: input.extractedText ?? null,
	})

	await updateDocumentRecord(input.documentId, {
		category_id: 'financial',
		sub_category_id: link.subCategoryId,
		title: link.title,
		extracted_metadata: link.extractedMetadata,
		knowledge_refs: link.knowledgeRefs,
		status: 'active',
	})
}

async function upsertFinanceRegistryRecord(input: {
	userId: string
	record: Awaited<ReturnType<typeof listRegistryRecords>>[number]
	familyMemberId: string | null
}): Promise<'imported' | 'updated' | 'skipped'> {
	if (!isImportableConnectorDocument(input.record)) {
		return 'skipped'
	}

	const folderPath = input.record.folderPath ?? null
	const existing = await findExistingFinanceDocument({
		userId: input.userId,
		externalFileId: input.record.externalFileId,
	})

	if (existing) {
		const link = buildFinanceDocumentLink({
			documentId: existing.id,
			fileName: input.record.fileName,
			folderPath,
			mimeType: input.record.mimeType ?? existing.mime_type,
			subCategoryId: existing.sub_category_id,
			extractedMetadata: {
				...existing.extracted_metadata,
				folderPath,
			},
			extractedText: existing.extracted_text,
		})

		await updateDocumentRecord(existing.id, {
			category_id: 'financial',
			sub_category_id: link.subCategoryId,
			title: link.title,
			extracted_metadata: link.extractedMetadata,
			knowledge_refs: link.knowledgeRefs,
			status: 'active',
		})

		if (
			shouldProcessFinanceDocument({
				subCategoryId: link.subCategoryId,
				extractedMetadata: link.extractedMetadata,
			})
		) {
			await processFinanceDocument({
				userId: input.userId,
				documentId: existing.id,
				fileName: input.record.fileName,
				folderPath,
				subCategoryId: link.subCategoryId,
				registryId: existing.connector_registry_id ?? input.record.id,
				externalFileId:
					existing.external_file_id ?? input.record.externalFileId,
				storagePath: existing.storage_path,
				extractedMetadata: link.extractedMetadata,
			})
		}

		return 'updated'
	}

	const download = await downloadDriveFile({
		userId: input.userId,
		externalFileId: input.record.externalFileId,
		fileName: input.record.fileName,
		registryId: input.record.id,
	})

	const documentInput = connectorRecordToDocumentInput({
		userId: input.userId,
		record: {
			...input.record,
			familyMemberId: input.familyMemberId,
		},
		storagePath: download.storagePath,
	})

	const document = await createDocumentRecord({
		...documentInput,
		categoryId: 'financial',
		familyMemberId: input.familyMemberId,
		status: 'active',
		extractedMetadata: {
			...(documentInput.extractedMetadata ?? {}),
			folderPath,
		},
	})

	const link = buildFinanceDocumentLink({
		documentId: document.id,
		fileName: document.file_name,
		folderPath,
		mimeType: document.mime_type,
		subCategoryId: document.sub_category_id,
		extractedMetadata: document.extracted_metadata,
	})

	await updateDocumentRecord(document.id, {
		category_id: 'financial',
		sub_category_id: link.subCategoryId,
		title: link.title,
		extracted_metadata: link.extractedMetadata,
		knowledge_refs: link.knowledgeRefs,
		status: 'active',
	})

	if (
		shouldProcessFinanceDocument({
			subCategoryId: link.subCategoryId,
			extractedMetadata: link.extractedMetadata,
		})
	) {
		await processFinanceDocument({
			userId: input.userId,
			documentId: document.id,
			fileName: document.file_name,
			folderPath,
			subCategoryId: link.subCategoryId,
			registryId: input.record.id,
			externalFileId: input.record.externalFileId,
			storagePath: download.storagePath,
			extractedMetadata: link.extractedMetadata,
		})
	}

	return 'imported'
}

export async function runFinanceImportSync(userId: string): Promise<{
	imported: number
	updated: number
}> {
	const [assignments, registry] = await Promise.all([
		listFinanceSourceAssignments(userId),
		listRegistryRecords(userId, 'google-drive'),
	])

	if (assignments.length === 0) {
		return { imported: 0, updated: 0 }
	}

	let imported = 0
	let updated = 0

	for (const record of registry) {
		const assignment = resolveModuleFolderAssignmentForFile(
			{
				folderExternalId: record.folderId ?? '',
				folderPath: record.folderPath,
			},
			assignments.map((entry) => ({
				id: entry.id,
				externalFolderId: entry.externalFolderId,
				folderName: entry.folderName,
				folderPath: entry.folderPath,
			})),
		)

		if (!assignment) {
			continue
		}

		const sourceAssignment = assignments.find(
			(entry) => entry.id === assignment.id,
		)

		const outcome = await upsertFinanceRegistryRecord({
			userId,
			record,
			familyMemberId: sourceAssignment?.familyMemberId ?? null,
		})

		if (outcome === 'imported') {
			imported += 1
		} else if (outcome === 'updated') {
			updated += 1
		}
	}

	const { data: pendingDocuments } = await supabase
		.from('chronicle_documents')
		.select(
			'id, file_name, sub_category_id, extracted_metadata, external_file_id, connector_registry_id, storage_path',
		)
		.eq('user_id', userId)
		.eq('category_id', 'financial')

	await processPendingFinanceDocuments({
		userId,
		documents: (pendingDocuments ?? []).map((row) => ({
			id: String(row.id),
			file_name: String(row.file_name),
			sub_category_id: (row.sub_category_id as string | null) ?? null,
			extracted_metadata:
				(row.extracted_metadata as Record<string, unknown> | null) ?? {},
			external_file_id: (row.external_file_id as string | null) ?? null,
			connector_registry_id:
				(row.connector_registry_id as string | null) ?? null,
			storage_path: String(row.storage_path ?? ''),
		})),
	})

	return { imported, updated }
}

export async function reclassifyFinanceDocuments(
	userId: string,
): Promise<number> {
	const { data, error } = await supabase
		.from('chronicle_documents')
		.select(
			'id, file_name, mime_type, sub_category_id, extracted_metadata, extracted_text',
		)
		.eq('user_id', userId)
		.eq('category_id', 'financial')

	if (error) {
		throw new Error(error.message)
	}

	let updated = 0

	for (const row of data ?? []) {
		const metadata =
			(row.extracted_metadata as Record<string, unknown> | null) ?? {}
		await applyFinanceDocumentLink({
			documentId: String(row.id),
			fileName: String(row.file_name),
			folderPath: readMetadataString(metadata, 'folderPath'),
			mimeType: String(row.mime_type ?? 'application/pdf'),
			subCategoryId: (row.sub_category_id as string | null) ?? null,
			extractedMetadata: metadata,
			extractedText: (row.extracted_text as string | null) ?? null,
		})
		updated += 1
	}

	return updated
}
