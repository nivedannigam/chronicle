import {
	ALLOWED_DOCUMENT_MIME_TYPES,
	DOCUMENT_MAX_FILE_SIZE_BYTES,
	DOCUMENTS_BUCKET,
	type ChronicleDocument,
} from '@/features/documents/types/document.types'
import {
	buildDocumentTitle,
	extractDocumentMetadata,
} from '@/features/documents/extraction/document-metadata.engine'
import {
	createDocumentRecord,
	updateDocumentRecord,
} from '@/features/documents/services/document.service'
import { supabase } from '@/lib/supabase'

function sanitizeFileName(fileName: string): string {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function uploadDocument(input: {
	userId: string
	file: File
	familyMemberId?: string | null
	categoryId?: string
}): Promise<ChronicleDocument> {
	if (
		!ALLOWED_DOCUMENT_MIME_TYPES.includes(
			input.file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
		)
	) {
		throw new Error('Unsupported file type. Upload PDF or image files.')
	}

	if (input.file.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
		throw new Error('File must be 15 MB or smaller.')
	}

	const metadata = extractDocumentMetadata({
		fileName: input.file.name,
		categoryHint: input.categoryId,
	})
	const documentId = crypto.randomUUID()
	const storagePath = `${input.userId}/${documentId}_${sanitizeFileName(input.file.name)}`

	const { error: uploadError } = await supabase.storage
		.from(DOCUMENTS_BUCKET)
		.upload(storagePath, input.file, {
			contentType: input.file.type,
			upsert: false,
		})

	if (uploadError) {
		throw new Error(uploadError.message)
	}

	const title = buildDocumentTitle({
		fileName: input.file.name,
		categoryId: metadata.categoryId,
		subCategoryId: metadata.subCategoryId,
		documentNumber: metadata.documentNumber,
	})

	try {
		const document = await createDocumentRecord({
			userId: input.userId,
			familyMemberId: input.familyMemberId,
			categoryId: input.categoryId ?? metadata.categoryId,
			subCategoryId: metadata.subCategoryId,
			title,
			fileName: input.file.name,
			storagePath,
			mimeType: input.file.type,
			issueDate: metadata.issueDate,
			expiryDate: metadata.expiryDate,
			issuer: metadata.issuer,
			documentNumber: metadata.documentNumber,
			extractedMetadata: {
				...metadata.fields,
				confidence: metadata.confidence,
				holderName: metadata.holderName,
				address: metadata.address,
			},
			source: 'upload',
		})

		return document
	} catch (error) {
		await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath])
		throw error
	}
}

export async function getDocumentSignedUrl(
	storagePath: string,
): Promise<string> {
	const { data, error } = await supabase.storage
		.from(DOCUMENTS_BUCKET)
		.createSignedUrl(storagePath, 3600)

	if (error) {
		throw new Error(error.message)
	}

	if (!data?.signedUrl) {
		throw new Error('Could not open document.')
	}

	return data.signedUrl
}

export async function applyExtractedTextToDocument(input: {
	documentId: string
	extractedText: string
}): Promise<ChronicleDocument> {
	const { data: existing, error } = await supabase
		.from('chronicle_documents')
		.select('file_name, category_id')
		.eq('id', input.documentId)
		.single()

	if (error || !existing) {
		throw new Error(error?.message ?? 'Document not found.')
	}

	const metadata = extractDocumentMetadata({
		fileName: String(existing.file_name),
		text: input.extractedText,
		categoryHint: String(existing.category_id),
	})

	return updateDocumentRecord(input.documentId, {
		extracted_text: input.extractedText,
		extracted_metadata: {
			...metadata.fields,
			confidence: metadata.confidence,
			holderName: metadata.holderName,
			address: metadata.address,
		},
		document_number: metadata.documentNumber,
		issue_date: metadata.issueDate,
		expiry_date: metadata.expiryDate,
		issuer: metadata.issuer,
	})
}
