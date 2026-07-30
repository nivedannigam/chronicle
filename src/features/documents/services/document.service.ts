import { supabase } from '@/lib/supabase'
import type {
	ChronicleDocument,
	CreateDocumentInput,
	DocumentAuditEntry,
} from '@/features/documents/types/document.types'

function mapDocument(row: Record<string, unknown>): ChronicleDocument {
	return {
		id: String(row.id),
		user_id: String(row.user_id),
		family_member_id: (row.family_member_id as string | null) ?? null,
		category_id: String(row.category_id),
		sub_category_id: (row.sub_category_id as string | null) ?? null,
		title: String(row.title),
		file_name: String(row.file_name),
		storage_path: String(row.storage_path),
		mime_type: String(row.mime_type ?? 'application/pdf'),
		issue_date: (row.issue_date as string | null) ?? null,
		expiry_date: (row.expiry_date as string | null) ?? null,
		issuer: (row.issuer as string | null) ?? null,
		document_number: (row.document_number as string | null) ?? null,
		tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
		notes: (row.notes as string | null) ?? null,
		status: row.status as ChronicleDocument['status'],
		source: row.source as ChronicleDocument['source'],
		connector_id: (row.connector_id as string | null) ?? null,
		external_file_id: (row.external_file_id as string | null) ?? null,
		connector_registry_id: (row.connector_registry_id as string | null) ?? null,
		extracted_text: (row.extracted_text as string | null) ?? null,
		extracted_metadata:
			(row.extracted_metadata as Record<string, unknown>) ?? {},
		knowledge_refs: Array.isArray(row.knowledge_refs)
			? (row.knowledge_refs as ChronicleDocument['knowledge_refs'])
			: [],
		audit: Array.isArray(row.audit) ? (row.audit as DocumentAuditEntry[]) : [],
		uploaded_at: String(row.uploaded_at),
		created_at: String(row.created_at),
		updated_at: String(row.updated_at),
	}
}

export async function listDocuments(
	userId: string,
): Promise<ChronicleDocument[]> {
	const { data, error } = await supabase
		.from('chronicle_documents')
		.select('*')
		.eq('user_id', userId)
		.order('uploaded_at', { ascending: false })

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapDocument(row as Record<string, unknown>))
}

export async function getDocument(
	documentId: string,
): Promise<ChronicleDocument | null> {
	const { data, error } = await supabase
		.from('chronicle_documents')
		.select('*')
		.eq('id', documentId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data ? mapDocument(data as Record<string, unknown>) : null
}

export async function createDocumentRecord(
	input: CreateDocumentInput,
): Promise<ChronicleDocument> {
	const auditEntry: DocumentAuditEntry = {
		action: 'created',
		at: new Date().toISOString(),
		actorUserId: input.userId,
		detail: `source:${input.source ?? 'upload'}`,
	}

	const { data, error } = await supabase
		.from('chronicle_documents')
		.insert({
			user_id: input.userId,
			family_member_id: input.familyMemberId ?? null,
			category_id: input.categoryId,
			sub_category_id: input.subCategoryId ?? null,
			title: input.title,
			file_name: input.fileName,
			storage_path: input.storagePath,
			mime_type: input.mimeType,
			issue_date: input.issueDate ?? null,
			expiry_date: input.expiryDate ?? null,
			issuer: input.issuer ?? null,
			document_number: input.documentNumber ?? null,
			tags: input.tags ?? [],
			notes: input.notes ?? null,
			status: input.status ?? 'active',
			source: input.source ?? 'upload',
			connector_id: input.connectorId ?? null,
			external_file_id: input.externalFileId ?? null,
			connector_registry_id: input.connectorRegistryId ?? null,
			extracted_text: input.extractedText ?? null,
			extracted_metadata: input.extractedMetadata ?? {},
			audit: [auditEntry],
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapDocument(data as Record<string, unknown>)
}

export async function updateDocumentRecord(
	documentId: string,
	patch: Partial<{
		title: string
		category_id: string
		sub_category_id: string | null
		issue_date: string | null
		expiry_date: string | null
		issuer: string | null
		document_number: string | null
		tags: string[]
		notes: string | null
		status: ChronicleDocument['status']
		extracted_text: string | null
		extracted_metadata: Record<string, unknown>
	}>,
): Promise<ChronicleDocument> {
	const { data, error } = await supabase
		.from('chronicle_documents')
		.update({
			...patch,
			updated_at: new Date().toISOString(),
		})
		.eq('id', documentId)
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapDocument(data as Record<string, unknown>)
}

export async function deleteDocumentRecord(documentId: string): Promise<void> {
	const { error } = await supabase
		.from('chronicle_documents')
		.delete()
		.eq('id', documentId)

	if (error) {
		throw new Error(error.message)
	}
}

export function filterDocumentsForMember(
	documents: ChronicleDocument[],
	memberId: string | null,
	accountOwnerMemberId: string | null,
): ChronicleDocument[] {
	if (!memberId) {
		return documents
	}

	return documents.filter(
		(document) =>
			document.family_member_id === memberId ||
			(document.family_member_id == null && memberId === accountOwnerMemberId),
	)
}

export function documentsExpiringWithin(
	documents: ChronicleDocument[],
	days: number,
	referenceDate = new Date(),
): ChronicleDocument[] {
	const cutoff = new Date(referenceDate)
	cutoff.setDate(cutoff.getDate() + days)

	return documents.filter((document) => {
		if (!document.expiry_date) {
			return false
		}

		const expiry = new Date(document.expiry_date)
		return expiry >= referenceDate && expiry <= cutoff
	})
}
