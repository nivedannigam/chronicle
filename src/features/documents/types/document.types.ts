export type DocumentStatus =
	'active' | 'archived' | 'expired' | 'processing' | 'failed'

export type DocumentSource = 'upload' | 'google-drive' | 'connector'

export interface DocumentKnowledgeRef {
	domain: string
	entityId: string
	label: string
}

export interface DocumentAuditEntry {
	action: string
	at: string
	actorUserId?: string
	detail?: string
}

export interface ChronicleDocument {
	id: string
	user_id: string
	family_member_id: string | null
	category_id: string
	sub_category_id: string | null
	title: string
	file_name: string
	storage_path: string
	mime_type: string
	issue_date: string | null
	expiry_date: string | null
	issuer: string | null
	document_number: string | null
	tags: string[]
	notes: string | null
	status: DocumentStatus
	source: DocumentSource
	connector_id: string | null
	external_file_id: string | null
	connector_registry_id: string | null
	extracted_text: string | null
	extracted_metadata: Record<string, unknown>
	knowledge_refs: DocumentKnowledgeRef[]
	audit: DocumentAuditEntry[]
	uploaded_at: string
	created_at: string
	updated_at: string
}

export interface CreateDocumentInput {
	userId: string
	familyMemberId?: string | null
	categoryId: string
	subCategoryId?: string | null
	title: string
	fileName: string
	storagePath: string
	mimeType: string
	source?: DocumentSource
	connectorId?: string | null
	externalFileId?: string | null
	connectorRegistryId?: string | null
	issueDate?: string | null
	expiryDate?: string | null
	issuer?: string | null
	documentNumber?: string | null
	tags?: string[]
	notes?: string | null
	extractedText?: string | null
	extractedMetadata?: Record<string, unknown>
	status?: DocumentStatus
	knowledgeRefs?: DocumentKnowledgeRef[]
}

export const DOCUMENTS_BUCKET = 'personal-documents' as const

export const DOCUMENT_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

export const ALLOWED_DOCUMENT_MIME_TYPES = [
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
] as const
