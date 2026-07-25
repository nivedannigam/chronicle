import type { ConnectorDocumentRecord } from '@/core/connectors'
import {
	buildDocumentTitle,
	extractDocumentMetadata,
} from '@/features/documents/extraction/document-metadata.engine'
import {
	createDocumentRecord,
	listDocuments,
} from '@/features/documents/services/document.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

export function isImportableConnectorDocument(
	record: ConnectorDocumentRecord,
): boolean {
	if (record.discoveryCategory === 'ignored') {
		return false
	}

	if (record.approvalStatus === 'rejected') {
		return false
	}

	const mime = record.mimeType.toLowerCase()
	return (
		mime.includes('pdf') ||
		mime.includes('image/jpeg') ||
		mime.includes('image/png') ||
		mime.includes('image/webp')
	)
}

export function connectorRecordToDocumentInput(input: {
	userId: string
	record: ConnectorDocumentRecord
	storagePath: string
}): Parameters<typeof createDocumentRecord>[0] {
	const metadata = extractDocumentMetadata({
		fileName: input.record.fileName,
		text: input.record.detectedPatient ?? undefined,
	})

	return {
		userId: input.userId,
		familyMemberId: input.record.familyMemberId,
		categoryId: metadata.categoryId,
		subCategoryId: metadata.subCategoryId,
		title: buildDocumentTitle({
			fileName: input.record.fileName,
			categoryId: metadata.categoryId,
			subCategoryId: metadata.subCategoryId,
			documentNumber: metadata.documentNumber,
		}),
		fileName: input.record.fileName,
		storagePath: input.storagePath,
		mimeType: input.record.mimeType,
		source: 'google-drive',
		connectorId: input.record.connectorId,
		externalFileId: input.record.externalFileId,
		connectorRegistryId: input.record.id,
		issueDate: metadata.issueDate,
		expiryDate: metadata.expiryDate,
		issuer: metadata.issuer,
		documentNumber: metadata.documentNumber,
		extractedMetadata: {
			...metadata.fields,
			confidence: metadata.confidence,
			folderPath: input.record.folderPath,
		},
	}
}

export async function listDocumentsForKnowledge(input: {
	userId: string
	memberId?: string | null
	accountOwnerMemberId?: string | null
}): Promise<ChronicleDocument[]> {
	const documents = await listDocuments(input.userId)

	if (!input.memberId) {
		return documents.filter((document) => document.status === 'active')
	}

	return documents.filter(
		(document) =>
			document.status === 'active' &&
			(document.family_member_id === input.memberId ||
				(document.family_member_id == null &&
					input.memberId === input.accountOwnerMemberId)),
	)
}

export function mergeDocumentsWithConnectorRecords(input: {
	documents: ChronicleDocument[]
	connectorRecords: ConnectorDocumentRecord[]
}): ChronicleDocument[] {
	const linkedExternalIds = new Set(
		input.documents
			.map((document) => document.external_file_id)
			.filter(Boolean) as string[],
	)

	const pending = input.connectorRecords
		.filter(isImportableConnectorDocument)
		.filter((record) => !linkedExternalIds.has(record.externalFileId))
		.map((record) => ({
			id: `connector-${record.id}`,
			user_id: record.userId,
			family_member_id: record.familyMemberId,
			category_id: extractDocumentMetadata({ fileName: record.fileName })
				.categoryId,
			sub_category_id: extractDocumentMetadata({ fileName: record.fileName })
				.subCategoryId,
			title: record.fileName,
			file_name: record.fileName,
			storage_path: '',
			mime_type: record.mimeType,
			issue_date: record.detectedReportDate,
			expiry_date: null,
			issuer: null,
			document_number: null,
			tags: [],
			notes: null,
			status: 'processing' as const,
			source: 'google-drive' as const,
			connector_id: record.connectorId,
			external_file_id: record.externalFileId,
			connector_registry_id: record.id,
			extracted_text: null,
			extracted_metadata: {
				discoveryCategory: record.discoveryCategory,
				folderPath: record.folderPath,
				pendingImport: true,
			},
			knowledge_refs: [],
			audit: [],
			uploaded_at: record.externalModifiedAt ?? record.importedAt ?? '',
			created_at: record.externalModifiedAt ?? '',
			updated_at: record.lastSyncAt ?? '',
		}))

	return [...input.documents, ...pending]
}
