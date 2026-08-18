import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { downloadDriveFile } from '@/features/connectors/google-drive/services/google-drive-api.service'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'
import {
	connectorRecordToDocumentInput,
	isImportableConnectorDocument,
} from '@/features/documents/services/document-import.service'
import { createDocumentRecord } from '@/features/documents/services/document.service'
import { processChronicleDocument } from '@/features/documents/services/documents-processing.service'
import { resolveIdentityOwnerMemberId } from '@/features/identity-knowledge/services/identity-member-resolver.service'
import { resolveIdentityTypeId } from '@/features/identity-knowledge/services/identity-type.registry'
import { listIdentitySourceAssignments } from '@/features/identity/services/identity-sources.service'
import { listFamilyMembersWithAliases } from '@/features/family/services/family.service'
import { supabase } from '@/lib/supabase'

async function importIdentityRegistryRecord(input: {
	userId: string
	record: Awaited<ReturnType<typeof listRegistryRecords>>[number]
	familyMemberId: string | null
}): Promise<boolean> {
	if (!isImportableConnectorDocument(input.record)) {
		return false
	}

	const { data: existing } = await supabase
		.from('chronicle_documents')
		.select('id')
		.eq('user_id', input.userId)
		.eq('external_file_id', input.record.externalFileId)
		.maybeSingle()

	if (existing?.id) {
		return false
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

	const typeId = resolveIdentityTypeId({
		subCategoryId: documentInput.subCategoryId ?? null,
		fileName: documentInput.fileName,
		folderPath: input.record.folderPath,
	})

	const document = await createDocumentRecord({
		...documentInput,
		categoryId: 'identity',
		subCategoryId: typeId === 'other' ? documentInput.subCategoryId : typeId,
		familyMemberId: input.familyMemberId,
		status: 'processing',
	})

	await processChronicleDocument(document)
	return true
}

export async function runIdentityImportSync(userId: string): Promise<{
	imported: number
}> {
	const [assignments, registry, members] = await Promise.all([
		listIdentitySourceAssignments(userId),
		listRegistryRecords(userId, 'google-drive'),
		listFamilyMembersWithAliases(userId),
	])

	if (assignments.length === 0) {
		return { imported: 0 }
	}

	const accountOwnerMemberId =
		members.find((member) => member.isAccountOwner)?.id ?? null

	let imported = 0

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

		const owner = resolveIdentityOwnerMemberId({
			documentMemberId: record.familyMemberId,
			folderPath: record.folderPath,
			fileName: record.fileName,
			members,
			accountOwnerMemberId,
		})

		const didImport = await importIdentityRegistryRecord({
			userId,
			record,
			familyMemberId: owner.memberId,
		})

		if (didImport) {
			imported += 1
		}
	}

	return { imported }
}
